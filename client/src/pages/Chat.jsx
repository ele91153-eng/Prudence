import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Prudence from '../components/Prudence.jsx';

const OPENER = {
  role: 'assistant',
  content: "Hey! I'm Prudence 👋 I have full context on your goals, today's tasks, and where you're at. What's on your mind — want a pep talk, help working through a blocker, or just to talk through your plan for today?",
};

const ACCEPTED = 'image/*,.pdf,.csv,.heic,.heif';
const MAX_SIZE = 10 * 1024 * 1024;

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
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
          {(file.size / 1024).toFixed(0)} KB
        </div>
      </div>
      <button onClick={onRemove} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 2,
        color: 'var(--ink-3)', display: 'flex', alignItems: 'center',
        flexShrink: 0,
      }}>
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
        ? <img src={imgSrc} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 5 }} />
        : <span className="ms" style={{ fontSize: 18, color: 'var(--accent)' }}>{fileIcon(file.type, file.name)}</span>
      }
      <span style={{ fontSize: 12, color: 'var(--accent-2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
        {file.name}
      </span>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: 10,
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 14,
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
            fontSize: 15,
            lineHeight: 1.5,
            fontWeight: 400,
            boxShadow: isUser ? '0 4px 12px rgba(236,139,67,.3)' : '0 2px 10px rgba(70,52,28,.08)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {msg.content}
            {msg.streaming && (
              <span style={{ display: 'inline-block', width: 6, height: 14, background: isUser ? 'rgba(255,255,255,.7)' : 'var(--ink-3)', borderRadius: 2, marginLeft: 3, animation: 'blink 1s steps(2) infinite', verticalAlign: 'middle' }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 14 }}>
      <Prudence size={32} style={{ flexShrink: 0 }} />
      <div style={{
        padding: '14px 18px',
        borderRadius: '20px 20px 20px 6px',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--ink-3)',
            animation: `prudencefloat 1.2s ease-in-out ${delay}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "What should I focus on today?",
  "I'm feeling behind — what do I do?",
  "Give me a pep talk.",
  "Help me adjust my schedule.",
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
    if (f.size > MAX_SIZE) {
      setError('File is too large. Maximum size is 10 MB.');
      return;
    }
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
      // Build API history — strip the UI opener and file refs (not serializable)
      const apiMessages = updatedMessages
        .filter(m => m !== OPENER && !(m.role === 'assistant' && m === messages[0]))
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content || '' }));

      let res;

      if (sentFile) {
        const form = new FormData();
        form.append('messages', JSON.stringify(apiMessages));
        form.append('file', sentFile);
        res = await fetch('/api/chat', { method: 'POST', body: form });
      } else {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

      setMessages(prev => prev.map((m, i) =>
        i === assistantIdx ? { role: 'assistant', content: accumulated } : m
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const canSend = (input.trim() || file) && !loading;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', background: 'var(--bg)',
      maxWidth: 480, margin: '0 auto',
    }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: 'calc(var(--safe-top) + 14px) 18px 14px',
        background: 'rgba(251,243,229,.96)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid var(--line)',
        flexShrink: 0,
        zIndex: 10,
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
      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px 16px 8px',
        display: 'flex', flexDirection: 'column',
      }}>
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        {loading && !messages[messages.length - 1]?.streaming && <TypingIndicator />}
        {error && (
          <div className="error-box" style={{ marginBottom: 12 }}>
            {error}
            <button className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips — only when fresh */}
      {messages.length === 1 && (
        <div style={{
          padding: '4px 16px 12px',
          display: 'flex', gap: 8, flexWrap: 'wrap',
          flexShrink: 0,
        }}>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                background: 'var(--surface)',
                border: '1.5px solid var(--line)',
                fontSize: 13, fontWeight: 600, color: 'var(--ink-2)',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* File preview above input */}
      {file && (
        <FilePreview file={file} onRemove={() => setFile(null)} />
      )}

      {/* Input bar */}
      <div style={{
        padding: `12px 14px calc(12px + var(--safe-bottom))`,
        background: 'rgba(251,243,229,.96)',
        backdropFilter: 'blur(14px)',
        borderTop: file ? 'none' : '1px solid var(--line)',
        display: 'flex', gap: 8, alignItems: 'flex-end',
        flexShrink: 0,
      }}>
        {/* Paperclip */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: file ? 'var(--accent-soft)' : 'var(--surface)',
            border: `1.5px solid ${file ? 'var(--accent)' : 'var(--line)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          title="Attach image, PDF, or CSV"
        >
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
            flex: 1,
            resize: 'none',
            border: '1.5px solid var(--line)',
            borderRadius: 18,
            padding: '11px 16px',
            fontSize: 15,
            lineHeight: 1.4,
            background: 'var(--surface)',
            color: 'var(--ink)',
            outline: 'none',
            maxHeight: 120,
            minHeight: 44,
            overflowY: 'auto',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s',
          }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--line)'}
        />

        <button
          onClick={() => send()}
          disabled={!canSend}
          style={{
            width: 44, height: 44,
            borderRadius: '50%',
            background: canSend ? 'var(--accent)' : 'var(--line)',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: canSend ? 'pointer' : 'default',
            flexShrink: 0,
            transition: 'background 0.2s',
            boxShadow: canSend ? '0 4px 12px rgba(236,139,67,.35)' : 'none',
          }}
        >
          {loading
            ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.3)' }} />
            : <span className="ms ms-fill" style={{ fontSize: 20, color: '#fff' }}>arrow_upward</span>
          }
        </button>
      </div>
    </div>
  );
}
