import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import Prudence from '../components/Prudence.jsx';

const STEPS = { GOAL: 'goal', QUESTIONS: 'questions', TIMES: 'times', GENERATING: 'generating' };

export default function NewGoal() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.GOAL);
  const [goalText, setGoalText] = useState('');
  const [deadline, setDeadline] = useState('');
  const [questions, setQuestions] = useState([]);
  const [category, setCategory] = useState('');
  const [answers, setAnswers] = useState({});
  const [preferredTimes, setPreferredTimes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGoalSubmit(e) {
    e.preventDefault();
    if (!goalText.trim() || !deadline) return;
    setLoading(true); setError(null);
    try {
      const result = await api.post('/goals/clarify', { goalText: goalText + ` by ${deadline}` });
      setQuestions(result.questions); setCategory(result.category);
      setStep(STEPS.QUESTIONS);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setLoading(true); setError(null);
    setStep(STEPS.GENERATING);
    try {
      const goal = await api.post('/goals', {
        title: goalText.slice(0, 80),
        description: goalText,
        deadline,
        category,
        clarifying_answers: answers,
        preferred_times: preferredTimes || 'flexible',
      });
      navigate(`/goals/${goal.id}`, { replace: true });
    } catch (e) {
      setError(e.message);
      setStep(STEPS.TIMES);
      setLoading(false);
    }
  }

  const stepNum = { goal: 1, questions: 2, times: 3, generating: 3 }[step];

  return (
    <div style={{ background: 'var(--canvas)', minHeight: '100dvh', paddingBottom: 'calc(var(--nav-h) + var(--safe-bottom) + 16px)' }}>
      <div className="sticky-header row-between">
        <button className="btn-icon" onClick={() => step === STEPS.GOAL ? navigate(-1) : setStep(s => s === STEPS.TIMES ? STEPS.QUESTIONS : STEPS.GOAL)}>
          <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>New goal</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Step {stepNum} of 3</div>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ padding: '28px 20px 0' }}>
        {error && <div className="error-box mb-4">{error}</div>}

        {step === STEPS.GOAL && (
          <form onSubmit={handleGoalSubmit} className="col gap-4">
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <Prudence size={72} style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>What's your goal?</h2>
              <p style={{ color: 'var(--ink-2)', fontSize: 15, lineHeight: 1.5 }}>
                Tell Prudence in plain language — any goal works.
              </p>
            </div>
            <div>
              <label className="label">Your goal</label>
              <textarea
                placeholder="e.g. Score 1600 on the SAT, run a marathon, learn conversational Spanish…"
                value={goalText}
                onChange={e => setGoalText(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading || !goalText.trim() || !deadline}>
              {loading
                ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Analyzing…</>
                : <>Continue <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span></>
              }
            </button>
          </form>
        )}

        {step === STEPS.QUESTIONS && (
          <form onSubmit={e => { e.preventDefault(); setStep(STEPS.TIMES); }} className="col gap-4">
            <div>
              <div className="pill pill-accent mb-3">{category}</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>A few quick questions</h2>
              <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.5 }}>
                Prudence needs these to build your personalized plan.
              </p>
            </div>
            {questions.map(q => (
              <div key={q.id}>
                <label className="label">{q.question}</label>
                <input
                  type="text"
                  placeholder={q.placeholder}
                  value={answers[q.id] || ''}
                  onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                />
              </div>
            ))}
            <button type="submit" className="btn btn-primary btn-full">
              Continue <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
            </button>
          </form>
        )}

        {step === STEPS.TIMES && (
          <form onSubmit={handleCreate} className="col gap-4">
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>When do you work best?</h2>
              <p style={{ color: 'var(--ink-2)', fontSize: 14, lineHeight: 1.5 }}>
                Prudence will schedule tasks around your preferred times.
              </p>
            </div>
            <div>
              <label className="label">Preferred task times</label>
              <textarea
                placeholder="e.g. Mornings before 10am, or weekday evenings 7–9pm, or flexible anytime"
                value={preferredTimes}
                onChange={e => setPreferredTimes(e.target.value)}
                rows={2}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Building your plan…</>
                : <>Generate my plan 🚀</>
              }
            </button>
          </form>
        )}

        {step === STEPS.GENERATING && (
          <div className="col" style={{ alignItems: 'center', paddingTop: 60, gap: 20 }}>
            <Prudence size={90} style={{ margin: '0 auto' }} />
            <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center' }}>Building your plan…</h2>
            <p style={{ color: 'var(--ink-2)', textAlign: 'center', maxWidth: 300, lineHeight: 1.55 }}>
              Prudence is researching the best evidence-based approach for your goal and creating a phased plan.
            </p>
            <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
          </div>
        )}
      </div>
    </div>
  );
}
