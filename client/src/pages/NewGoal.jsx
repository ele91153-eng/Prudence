import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';

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
    setLoading(true);
    setError(null);
    try {
      const result = await api.post('/goals/clarify', { goalText: goalText + (deadline ? ` by ${deadline}` : '') });
      setQuestions(result.questions);
      setCategory(result.category);
      setStep(STEPS.QUESTIONS);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuestionsSubmit(e) {
    e.preventDefault();
    setStep(STEPS.TIMES);
  }

  async function handleTimesSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
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

  return (
    <div style={{ paddingBottom: 80 }}>
      <div className="header">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>←</button>
          <h1>New Goal</h1>
        </div>
      </div>

      <div className="page" style={{ paddingTop: 20 }}>
        {error && <div className="error-box mb-4">{error}</div>}

        {step === STEPS.GOAL && (
          <form onSubmit={handleGoalSubmit}>
            <div className="mb-4">
              <label className="label">What's your goal?</label>
              <textarea
                placeholder="e.g. Score 1600 on the SAT, run a marathon, learn conversational Spanish…"
                value={goalText}
                onChange={e => setGoalText(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="label">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading || !goalText.trim() || !deadline}>
              {loading ? <><span className="spinner" /> Analyzing your goal…</> : 'Continue →'}
            </button>
          </form>
        )}

        {step === STEPS.QUESTIONS && (
          <form onSubmit={handleQuestionsSubmit}>
            <p className="text-muted text-sm mb-4">A few quick questions to personalize your plan:</p>
            {questions.map(q => (
              <div key={q.id} className="mb-4">
                <label className="label">{q.question}</label>
                <input
                  type="text"
                  placeholder={q.placeholder}
                  value={answers[q.id] || ''}
                  onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                />
              </div>
            ))}
            <button type="submit" className="btn btn-primary w-full">
              Continue →
            </button>
          </form>
        )}

        {step === STEPS.TIMES && (
          <form onSubmit={handleTimesSubmit}>
            <div className="mb-4">
              <label className="label">When do you prefer to do your tasks?</label>
              <textarea
                placeholder="e.g. Mornings before 10am, or weekday evenings 7-9pm, or anytime flexible"
                value={preferredTimes}
                onChange={e => setPreferredTimes(e.target.value)}
                rows={2}
              />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <><span className="spinner" /> Building your plan…</> : 'Generate My Plan 🚀'}
            </button>
          </form>
        )}

        {step === STEPS.GENERATING && (
          <div className="loading-screen" style={{ paddingTop: 40 }}>
            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
            <h2>Building your plan…</h2>
            <p className="text-muted text-sm" style={{ textAlign: 'center', maxWidth: 280 }}>
              The AI is researching the best evidence-based approach for your goal and creating a personalized phased plan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
