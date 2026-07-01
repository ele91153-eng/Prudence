import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import db from '../db.js';

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

      // Today's tasks + completion
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

      // Recent streak
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

      // Recent metrics
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
- Keep responses under 150 words unless the user asks for something detailed.`;
}

// POST /api/chat — stateless per call, history passed in body
router.post('/', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Validate message shape
  const cleaned = messages
    .filter(m => m.role && m.content && typeof m.content === 'string')
    .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

  if (cleaned.length === 0) {
    return res.status(400).json({ error: 'No valid messages' });
  }

  try {
    const systemPrompt = buildSystemPrompt();

    // Stream the response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages: cleaned,
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
