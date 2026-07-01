import express from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import db from '../db.js';
import { createHash } from 'crypto';

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// In-memory PDF parse cache (hash → extracted text)
const pdfCache = new Map();

// Multer: memory storage, 10 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function buildSystemPrompt() {
  const today = localToday();
  const goals = db.prepare(`SELECT * FROM goals WHERE is_active = 1`).all();

  let context = '';

  if (goals.length === 0) {
    context = 'The user has no active goals yet. Encourage them to set their first goal.';
  } else {
    context = goals.map(goal => {
      const phases = JSON.parse(goal.phases || '[]');
      const startDate = goal.created_at.split('T')[0].split(' ')[0];
      const dayNumber = Math.max(1, Math.ceil((new Date(today) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1);
      const daysLeft = Math.ceil((new Date(goal.deadline) - new Date(today)) / (1000 * 60 * 60 * 24));
      const currentPhase = phases.find(p => dayNumber >= p.start_day && dayNumber <= p.end_day) || phases[phases.length - 1];

      const dayRecord = db.prepare(`SELECT * FROM days WHERE goal_id = ? AND date = ?`).get(goal.id, today);
      let taskSummary = 'No tasks generated for today yet.';
      if (dayRecord) {
        const tasks = JSON.parse(dayRecord.tasks || '[]');
        const completions = db.prepare(`SELECT * FROM task_completions WHERE day_id = ?`).all(dayRecord.id);
        taskSummary = tasks.map((t, i) => {
          const c = completions.find(c => c.task_index === i);
          const status = c?.status || 'pending';
          return `  - [${status.toUpperCase()}] ${t.time || ''} ${t.title}: ${t.instruction?.slice(0, 100)}`;
        }).join('\n');
      }

      const recentDays = db.prepare(`
        SELECT d.date, COUNT(tc.id) as total, SUM(CASE WHEN tc.status='done' THEN 1 ELSE 0 END) as done
        FROM days d LEFT JOIN task_completions tc ON tc.day_id = d.id
        WHERE d.goal_id = ? GROUP BY d.date ORDER BY d.date DESC LIMIT 7
      `).all(goal.id);
      let streak = 0;
      for (const d of recentDays) {
        if (d.total > 0 && d.done >= d.total * 0.5) streak++;
        else break;
      }

      const metrics = db.prepare(`SELECT * FROM metrics WHERE goal_id = ? ORDER BY date DESC LIMIT 5`).all(goal.id);
      const metricText = metrics.length
        ? metrics.map(m => `  ${m.metric_name}: ${m.value} (${m.date})`).join('\n')
        : '  None logged yet.';

      return `
GOAL: "${goal.title}"
  Deadline: ${goal.deadline} (${Math.max(0, daysLeft)} days left)
  Day: ${dayNumber} of ~${dayNumber + daysLeft}
  Current phase: ${currentPhase?.name || 'unknown'} — ${currentPhase?.description || ''}
  Current streak: ${streak} days
  Category: ${goal.category || 'general'}

Today's tasks:
${taskSummary}

Recent logged metrics:
${metricText}
`.trim();
    }).join('\n\n---\n\n');
  }

  return `You are Prudence, the AI coach inside "Prudence: AI for Productivity." You are warm, direct, and genuinely coach-like — not corporate, not generic. You care about the user's actual progress.

TODAY: ${today} (${new Date().toLocaleDateString('en-US', { weekday: 'long' })})

USER'S ACTIVE GOALS AND CONTEXT:
${context}

HOW TO BEHAVE:
- Be specific and personal. Reference real task names, phase names, and deadlines from the context above.
- Proactively notice things: if a task is pending, mention it. If they're on a streak, celebrate it. If they're behind, address it with honesty and encouragement.
- Be concise. Coaches don't give essays — they give clear, actionable guidance.
- Ask follow-up questions to understand blockers, not just to fill space.
- When you give advice, tie it to their actual goal and phase. Generic advice is useless.
- Use the user's own goal language back to them.
- Prudence voice: warm friend who happens to be an expert, not a corporate chatbot.
- Keep responses under 150 words unless the user asks for something detailed.

WHEN RECEIVING FILES:
- Never assume what a file is — read it carefully first and describe what you actually see.
- Connect relevant file content to the user's active goals when there's a clear link (e.g. a Strava screenshot → marathon goal).
- For study material: offer to quiz, summarize key sections, or build a study schedule.
- For fitness/performance data: extract the numbers, compare to goal targets, give specific coaching.
- For score reports: identify strengths and gaps, relate to prep strategy.
- For anything else: respond naturally to what you see without forcing a goal connection.`;
}

async function parsePdf(buffer) {
  const hash = createHash('md5').update(buffer).digest('hex');
  if (pdfCache.has(hash)) return pdfCache.get(hash);

  // Dynamic import so the module loads after install
  const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
  const result = await pdfParse(buffer);
  const text = result.text.slice(0, 40000); // cap at 40k chars
  pdfCache.set(hash, text);
  if (pdfCache.size > 50) {
    // Evict oldest
    const firstKey = pdfCache.keys().next().value;
    pdfCache.delete(firstKey);
  }
  return text;
}

async function parseCsv(buffer) {
  const { default: Papa } = await import('papaparse');
  const text = buffer.toString('utf8');
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (!result.data.length) return 'Empty CSV file.';

  const headers = result.meta.fields || [];
  const rows = result.data.slice(0, 100); // cap rows
  const lines = [headers.join(' | '), headers.map(() => '---').join(' | ')];
  rows.forEach(row => lines.push(headers.map(h => String(row[h] ?? '')).join(' | ')));

  const table = lines.join('\n');
  const summary = `CSV with ${result.data.length} rows and ${headers.length} columns: ${headers.join(', ')}`;
  return `${summary}\n\n${table}`;
}

// Build the Anthropic messages array, injecting file content into the last user message
async function buildMessages(messages, file) {
  const cleaned = messages
    .filter(m => m.role && m.content && typeof m.content === 'string')
    .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

  if (!file || !cleaned.length) return cleaned;

  const lastMsg = cleaned[cleaned.length - 1];
  if (lastMsg.role !== 'user') return cleaned;

  const mime = file.mimetype;
  const isImage = mime.startsWith('image/');
  const isPdf = mime === 'application/pdf';
  const isCsv = mime === 'text/csv' || file.originalname?.endsWith('.csv');

  const contentBlocks = [];

  if (isImage) {
    // Map HEIC → jpeg for Anthropic (best effort; real HEIC conversion needs native libs)
    const mediaType = mime === 'image/heic' || mime === 'image/heif' ? 'image/jpeg' : mime;
    const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!supported.includes(mediaType)) {
      contentBlocks.push({ type: 'text', text: `[Attached image type "${mime}" is not supported for vision. Please convert to JPG or PNG.]` });
    } else {
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: file.buffer.toString('base64'),
        },
      });
    }
  } else if (isPdf) {
    const pdfText = await parsePdf(file.buffer);
    contentBlocks.push({ type: 'text', text: `[PDF: "${file.originalname}" — extracted text below]\n\n${pdfText}` });
  } else if (isCsv) {
    const csvText = await parseCsv(file.buffer);
    contentBlocks.push({ type: 'text', text: `[CSV: "${file.originalname}"]\n\n${csvText}` });
  } else {
    contentBlocks.push({ type: 'text', text: `[Attached file: "${file.originalname}" (${mime}) — cannot preview this file type]` });
  }

  if (lastMsg.content.trim()) {
    contentBlocks.push({ type: 'text', text: lastMsg.content });
  }

  const updatedMessages = [...cleaned.slice(0, -1), { role: 'user', content: contentBlocks }];
  return updatedMessages;
}

// POST /api/chat — multipart/form-data with optional file attachment
router.post('/', upload.single('file'), async (req, res) => {
  let messages;
  try {
    messages = JSON.parse(req.body.messages || req.body.messages_json || '[]');
    if (!Array.isArray(messages)) throw new Error('invalid');
  } catch {
    // Also support plain JSON body (no file)
    if (req.is('application/json')) {
      messages = req.body.messages;
    }
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const systemPrompt = buildSystemPrompt();
    const apiMessages = await buildMessages(messages, req.file);

    if (!apiMessages.length) {
      return res.status(400).json({ error: 'No valid messages' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: apiMessages,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Chat error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

export default router;
