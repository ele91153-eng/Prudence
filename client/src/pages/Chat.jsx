import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Prudence from '../components/Prudence.jsx';
import { api } from '../utils/api.js';
import { getAccessToken } from '../utils/auth.js';

const OPENER = {
  role: 'assistant',
  content: "Hey! I'm Prudence 👋 I have full context on your goals, today's tasks, and where you're at. What's on your mind — want a pep talk, help working through a blocker, or just to talk through your plan for today?",
};

const ACCEPTED = 'image/*,.pdf,.csv,.heic,.heif';
const MAX_SIZE = 10 * 1024 * 1024;
const GOAL_READY_RE = /\[GOAL_READY:(\{[\s\S]*?\})\]/;

function fileIcon(mime, name) {
  if (mime?.startsWith('image/')) return 'image';
  if (mime === 'application/pdf' || name?.endsWith('.pdf')) return 'picture_as_pdf';
  if (mime === 'text/csv' || name?.endsWith('.csv')) return 'table_chart';
  return 'attach_file';
}

function FilePreview({ file, onRemove }) {
  const isImage = file.type.startsWith('image/');
  const [imgSrc, setImgSrc] = useState(null);
  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--surface)', border: '1.5px solid var(--accent-soft)',
      borderRadius: 12, padding: '8px 12px',
      maxWidth: 260, margin: '0 16px 6px',
      boxShadow: '0 2px 8px rgba(236,139,67,.12)',
    }}>
      {isImage && imgSrc
        ? <img src={imgSrc} alt="" style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
        : <span className="ms ms-fill" style={{ fontSize: 28, color: 'var(--accent)', flexShrink: 0 }}>{fileIcon(file.type, file.name)}</span>
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{(file.size / 1024).toFixed(0)} KB</div>
      </div>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <span className="ms" style={{ fontSize: 18 }}>close</span>
      </button>
    </div>
  );
}

function AttachedFileChip({ file }) {
  const isImage = file?.type?.startsWith('image/');
  const [imgSrc, setImgSrc] = useState(null);
  useEffect(() => {
    if (!isImage || !file) return;
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);
  if (!file) return null;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(236,139,67,.12)', border: '1px solid rgba(236,139,67,.3)',
      borderRadius: 8, padding: '4px 8px', marginBottom: 6, maxWidth: '100%',
    }}>
      {isImage && imgSrc
        ? <img src={imgSrc} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
        : <span className="ms" style={{ fontSize: 16, color: 'var(--accent)' }}>{fileIcon(file.type, file.name)}</span>
      }
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{file.name}</span>
    </div>
  );
}

// Markdown styles for assistant bubbles
const mdComponents = {
  p: ({ children }) => <p style={{ margin: '0 0 6px', lineHeight: 1.55 }}>{children}</p>,
  strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: '4px 0 6px' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: '4px 0 6px' }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
  h1: ({ children }) => <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>{children}</div>,
  h2: ({ children }) => <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{children}</div>,
  h3: ({ children }) => <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{children}</div>,
  code: ({ children }) => <code style={{ background: 'rgba(0,0,0,.08)', padding: '1px 5px', borderRadius: 4, fontSize: 13 }}>{children}</code>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '8px 0' }} />,
};

function GoalConfirmCard({ goalData, onConfirm, onDismiss, confirming, confirmed }) {
  const navigate = useNavigate();
  return (
    <div style={{
      background: 'var(--accent-soft)', border: '2px solid var(--accent)',
      borderRadius: 16, padding: '14px 16px', marginTop: 8,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        🎯 New Goal
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>{goalData.title}</div>
      {goalData.deadline && (
        <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 4 }}>
          📅 By {new Date(goalData.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      )}
      {goalData.why && (
        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', marginBottom: 10 }}>"{goalData.why}"</div>
      )}
      {confirmed ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sage)' }}>✓ Added to dashboard!</span>
          <button
            onClick={() => navigate('/')}
            style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
          >
            Go to Dashboard →
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="btn btn-primary"
            style={{ flex: 1, fontSize: 14, padding: '10px 0' }}
          >
            {confirming ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Confirm Goal ✓'}
          </button>
          <button onClick={onDismiss} className="btn btn-ghost" style={{ fontSize: 14, padding: '10px 14px' }}>
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

function Message({ msg, onGoalConfirm }) {
  const isUser = msg.role === 'user';
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  async function handleConfirm() {
    setConfirming(true);
    try {
      await api.post('/goals', {
        description: msg.goalData.description || msg.goalData.title,
        deadline: msg.goalData.deadline,
        title: msg.goalData.title,
        color: msg.goalData.color || '#EC8B43',
      });
      setConfirmed(true);
      onGoalConfirm?.();
    } catch (e) {
      console.error('Goal creation failed:', e);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-end', gap: 10, marginBottom: 14,
    }}>
      {!isUser && <Prudence size={32} style={{ flexShrink: 0, marginBottom: 2 }} />}
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {msg.file && <AttachedFileChip file={msg.file} />}
        {(msg.content || msg.streaming) && (
          <div style={{
            padding: '12px 16px',
            borderRadius: isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
            background: isUser ? 'var(--accent)' : 'var(--surface)',
            color: isUser ? '#fff' : 'var(--ink)',
            border: isUser ? 'none' : '1px solid var(--line)',
            fontSize: 15, lineHeight: 1.5, fontWeight: 400,
            boxShadow: isUser ? '0 4px 12px rgba(236,139,67,.3)' : '0 2px 10px rgba(70,52,28,.08)',
            wordBreak: 'break-word',
          }}>
            {isUser ? (
              <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
            ) : (
              <ReactMarkdown components={mdComponents}>
                {msg.content || ''}
              </ReactMarkdown>
            )}
            {msg.streaming && (
              <span style={{ display: 'inline-block', width: 6, height: 14, background: 'var(--ink-3)', borderRadius: 2, marginLeft: 3, animation: 'blink 1s steps(2) infinite', verticalAlign: 'middle' }} />
            )}
          </div>
        )}
        {/* Goal confirm card */}
        {msg.goalData && !dismissed && (
          <GoalConfirmCard
            goalData={msg.goalData}
            onConfirm={handleConfirm}
            onDismiss={() => setDismissed(true)}
            confirming={confirming}
            confirmed={confirmed}
          />
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 14 }}>
      <Prudence size={32} style={{ flexShrink: 0 }} />
      <div style={{ padding: '14px 18px', borderRadius: '20px 20px 20px 6px', background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', gap: 5, alignItems: 'center' }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ink-3)', animation: `prudencefloat 1.2s ease-in-out ${delay}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "What should I focus on today?",
  "Help me set up a new goal",
  "I'm feeling behind — what do I do?",
  "Give me a pep talk.",
];

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([OPENER]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE) { setError('File too large — max 10 MB.'); return; }
    setFile(f);
    setError(null);
    e.target.value = '';
  }

  const send = useCallback(async (text) => {
    const content = (text || input).trim();
    if ((!content && !file) || loading) return;

    const sentFile = file;
    setInput('');
    setFile(null);
    setError(null);

    const userMsg = { role: 'user', content: content || '', file: sentFile };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    const assistantIdx = updatedMessages.length;
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    try {
      const apiMessages = updatedMessages
        .filter(m => m !== OPENER && !(m.role === 'assistant' && m === messages[0]))
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content || '' }));

      const token = await getAccessToken();
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      let res;
      if (sentFile) {
        const form = new FormData();
        form.append('messages', JSON.stringify(apiMessages));
        form.append('file', sentFile);
        res = await fetch('/api/chat', { method: 'POST', headers: authHeader, body: form });
      } else {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          body: JSON.stringify({ messages: apiMessages }),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              accumulated += parsed.text;
              setMessages(prev => prev.map((m, i) =>
                i === assistantIdx ? { ...m, content: accumulated, streaming: true } : m
              ));
            }
            if (parsed.error) throw new Error(parsed.error);
          } catch (e) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
      }

      // Check for goal creation marker
      const goalMatch = accumulated.match(GOAL_READY_RE);
      let cleanContent = accumulated;
      let goalData = null;
      if (goalMatch) {
        try {
          goalData = JSON.parse(goalMatch[1]);
          cleanContent = accumulated.replace(GOAL_READY_RE, '').trim();
        } catch (_) {}
      }

      setMessages(prev => prev.map((m, i) =>
        i === assistantIdx ? { role: 'assistant', content: cleanContent, goalData } : m
      ));
    } catch (e) {
      setError(e.message);
      setMessages(prev => prev.filter((_, i) => i !== assistantIdx));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, file, messages, loading]);

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const canSend = (input.trim() || file) && !loading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)', maxWidth: 480, margin: '0 auto' }}>
      <input ref={fileInputRef} type="file" accept={ACCEPTED} style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: 'calc(var(--safe-top) + 14px) 18px 14px',
        background: 'rgba(251,243,229,.96)', backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--line)', flexShrink: 0, zIndex: 10,
      }}>
        <button className="btn-icon" onClick={() => navigate(-1)}>
          <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
        </button>
        <Prudence size={40} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>Prudence</div>
          <div style={{ fontSize: 12, color: 'var(--sage)', fontWeight: 600 }}>
            {loading ? 'typing…' : 'AI for Productivity'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 8px', display: 'flex', flexDirection: 'column' }}>
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} onGoalConfirm={() => {}} />
        ))}
        {loading && !messages[messages.length - 1]?.streaming && <TypingIndicator />}
        {error && (
          <div className="error-box" style={{ marginBottom: 12 }}>
            {error}
            <button className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      {messages.length === 1 && (
        <div style={{ padding: '4px 16px 12px', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)} style={{
              padding: '8px 14px', borderRadius: 999,
              background: 'var(--surface)', border: '1.5px solid var(--line)',
              fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>{s}</button>
          ))}
        </div>
      )}

      {file && <FilePreview file={file} onRemove={() => setFile(null)} />}

      {/* Input bar */}
      <div style={{
        padding: `12px 14px calc(12px + var(--safe-bottom))`,
        background: 'rgba(251,243,229,.96)', backdropFilter: 'blur(14px)',
        borderTop: file ? 'none' : '1px solid var(--line)',
        display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
      }}>
        <button onClick={() => fileInputRef.current?.click()} disabled={loading} style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: file ? 'var(--accent-soft)' : 'var(--surface)',
          border: `1.5px solid ${file ? 'var(--accent)' : 'var(--line)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}>
          <span className="ms" style={{ fontSize: 20, color: file ? 'var(--accent)' : 'var(--ink-3)' }}>attach_file</span>
        </button>

        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={file ? 'Add a message… (optional)' : 'Message Prudence…'}
          rows={1}
          disabled={loading}
          style={{
            flex: 1, resize: 'none',
            border: '1.5px solid var(--line)', borderRadius: 18,
            padding: '11px 16px', fontSize: 15, lineHeight: 1.4,
            background: 'var(--surface)', color: 'var(--ink)',
            outline: 'none', maxHeight: 120, minHeight: 44,
            overflowY: 'auto', fontFamily: 'inherit', transition: 'border-color 0.15s',
          }}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--line)'}
        />

        <button onClick={() => send()} disabled={!canSend} style={{
          width: 44, height: 44, borderRadius: '50%',
          background: canSend ? 'var(--accent)' : 'var(--line)',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: canSend ? 'pointer' : 'default', flexShrink: 0,
          transition: 'background 0.2s',
          boxShadow: canSend ? '0 4px 12px rgba(236,139,67,.35)' : 'none',
        }}>
          {loading
            ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.3)' }} />
            : <span className="ms ms-fill" style={{ fontSize: 20, color: '#fff' }}>arrow_upward</span>
          }
        </button>
      </div>
    </div>
  );
}
