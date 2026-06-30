import express from 'express';
import db from '../db.js';
import { generateClarifyingQuestions, generateFullPlan, generateDayTasks, regenerateDayTasks } from '../ai.js';

const router = express.Router();

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Get all active goals
router.get('/', (req, res) => {
  const goals = db.prepare(`SELECT * FROM goals WHERE is_active = 1 ORDER BY created_at DESC`).all();
  res.json(goals.map(g => ({
    ...g,
    phases: JSON.parse(g.phases || '[]'),
    clarifying_answers: JSON.parse(g.clarifying_answers || '{}'),
  })));
});

// Get single goal
router.get('/:id', (req, res) => {
  const goal = db.prepare(`SELECT * FROM goals WHERE id = ?`).get(req.params.id);
  if (!goal) return res.status(404).json({ error: 'Not found' });
  res.json({
    ...goal,
    phases: JSON.parse(goal.phases || '[]'),
    clarifying_answers: JSON.parse(goal.clarifying_answers || '{}'),
  });
});

// Step 1: Get clarifying questions for a goal
router.post('/clarify', async (req, res) => {
  const { goalText } = req.body;
  if (!goalText) return res.status(400).json({ error: 'goalText required' });
  try {
    const result = await generateClarifyingQuestions(goalText);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Step 2: Create goal with full plan
router.post('/', async (req, res) => {
  const { title, description, deadline, category, clarifying_answers, preferred_times } = req.body;
  if (!description || !deadline) return res.status(400).json({ error: 'description and deadline required' });

  try {
    const plan = await generateFullPlan(
      { description, deadline, category },
      clarifying_answers || {},
      preferred_times || 'flexible'
    );

    const result = db.prepare(`
      INSERT INTO goals (title, description, deadline, category, phases, clarifying_answers, preferred_times)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      title || description.slice(0, 60),
      description,
      deadline,
      category || plan.category || 'other',
      JSON.stringify(plan.phases),
      JSON.stringify(clarifying_answers || {}),
      preferred_times || 'flexible'
    );

    const goal = db.prepare(`SELECT * FROM goals WHERE id = ?`).get(result.lastInsertRowid);
    res.json({
      ...goal,
      phases: plan.phases,
      overview: plan.overview,
      metrics_to_track: plan.metrics_to_track,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete/archive a goal
router.delete('/:id', (req, res) => {
  db.prepare(`UPDATE goals SET is_active = 0 WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// Get today's tasks for a goal
router.get('/:id/today', async (req, res) => {
  const goal = db.prepare(`SELECT * FROM goals WHERE id = ?`).get(req.params.id);
  if (!goal) return res.status(404).json({ error: 'Not found' });

  const today = localToday();
  const startDate = goal.created_at.split('T')[0].split(' ')[0];
  const dayNumber = Math.ceil((new Date(today) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
  const daysUntilDeadline = Math.ceil((new Date(goal.deadline) - new Date(today)) / (1000 * 60 * 60 * 24));

  const phases = JSON.parse(goal.phases || '[]');
  const currentPhase = phases.find(p => dayNumber >= p.start_day && dayNumber <= p.end_day) || phases[phases.length - 1];

  // Check cache
  let dayRecord = db.prepare(`SELECT * FROM days WHERE goal_id = ? AND date = ?`).get(goal.id, today);

  if (!dayRecord) {
    // Get recent completion history
    const recentDays = db.prepare(`
      SELECT d.date, d.tasks, d.day_number,
             json_group_array(json_object('task_index', tc.task_index, 'status', tc.status)) as completions
      FROM days d
      LEFT JOIN task_completions tc ON tc.day_id = d.id
      WHERE d.goal_id = ?
      ORDER BY d.date DESC
      LIMIT 7
    `).all(goal.id);

    const tasks = await generateDayTasks(
      { ...goal, phases },
      today,
      dayNumber,
      currentPhase || { name: 'Training', description: 'Working toward your goal', focus: 'consistency' },
      recentDays,
      goal.preferred_times
    );

    const insertResult = db.prepare(`
      INSERT OR IGNORE INTO days (goal_id, date, day_number, phase_name, tasks)
      VALUES (?, ?, ?, ?, ?)
    `).run(goal.id, today, dayNumber, currentPhase?.name || 'Training', JSON.stringify(tasks));

    dayRecord = db.prepare(`SELECT * FROM days WHERE goal_id = ? AND date = ?`).get(goal.id, today);
  }

  const completions = db.prepare(`SELECT * FROM task_completions WHERE day_id = ?`).all(dayRecord.id);
  const tasks = JSON.parse(dayRecord.tasks);

  res.json({
    goal_id: goal.id,
    goal_title: goal.title,
    date: today,
    day_number: dayNumber,
    days_until_deadline: daysUntilDeadline,
    deadline: goal.deadline,
    phase_name: dayRecord.phase_name,
    current_phase: currentPhase,
    tasks: tasks.map((t, i) => ({
      ...t,
      index: i,
      status: completions.find(c => c.task_index === i)?.status || 'pending',
      completed_at: completions.find(c => c.task_index === i)?.completed_at,
    })),
    day_id: dayRecord.id,
  });
});

// Update task completion status
router.post('/:id/tasks/:dayId/:taskIndex/status', (req, res) => {
  const { status, note } = req.body;
  const { dayId, taskIndex } = req.params;
  const completedAt = status === 'done' ? new Date().toISOString() : null;

  db.prepare(`
    INSERT INTO task_completions (day_id, task_index, status, completed_at, note)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(day_id, task_index) DO UPDATE SET status = excluded.status, completed_at = excluded.completed_at, note = excluded.note
  `).run(parseInt(dayId), parseInt(taskIndex), status, completedAt, note || null);

  res.json({ ok: true });
});

// Edit an individual task block (updates the JSON in the days table)
router.post('/:id/tasks/:dayId/:taskIndex/edit', (req, res) => {
  const { dayId, taskIndex } = req.params;
  const { time, time_end, title, instruction } = req.body;

  const dayRecord = db.prepare(`SELECT * FROM days WHERE id = ?`).get(parseInt(dayId));
  if (!dayRecord) return res.status(404).json({ error: 'Day not found' });

  const tasks = JSON.parse(dayRecord.tasks);
  const idx = parseInt(taskIndex);
  if (idx < 0 || idx >= tasks.length) return res.status(404).json({ error: 'Task not found' });

  tasks[idx] = {
    ...tasks[idx],
    ...(time !== undefined && { time }),
    ...(time_end !== undefined && { time_end }),
    ...(title !== undefined && { title }),
    ...(instruction !== undefined && { instruction }),
  };

  db.prepare(`UPDATE days SET tasks = ? WHERE id = ?`).run(JSON.stringify(tasks), parseInt(dayId));
  res.json({ ok: true, task: tasks[idx] });
});

// Regenerate today's tasks
router.post('/:id/today/regenerate', async (req, res) => {
  const { reason } = req.body;
  const goal = db.prepare(`SELECT * FROM goals WHERE id = ?`).get(req.params.id);
  if (!goal) return res.status(404).json({ error: 'Not found' });

  const today = localToday();
  const startDate = goal.created_at.split('T')[0].split(' ')[0];
  const dayNumber = Math.ceil((new Date(today) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

  const phases = JSON.parse(goal.phases || '[]');
  const currentPhase = phases.find(p => dayNumber >= p.start_day && dayNumber <= p.end_day) || phases[phases.length - 1];

  const dayRecord = db.prepare(`SELECT * FROM days WHERE goal_id = ? AND date = ?`).get(goal.id, today);
  const originalTasks = dayRecord ? JSON.parse(dayRecord.tasks) : [];

  try {
    const tasks = await regenerateDayTasks(
      { ...goal, phases },
      today,
      dayNumber,
      currentPhase || { name: 'Training', description: 'Working toward your goal', focus: 'consistency' },
      originalTasks,
      reason || 'User requested alternative tasks',
      goal.preferred_times
    );

    db.prepare(`
      INSERT INTO days (goal_id, date, day_number, phase_name, tasks)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(goal_id, date) DO UPDATE SET tasks = excluded.tasks, generated_at = datetime('now')
    `).run(goal.id, today, dayNumber, currentPhase?.name || 'Training', JSON.stringify(tasks));

    // Clear completions for this day
    if (dayRecord) {
      db.prepare(`DELETE FROM task_completions WHERE day_id = ?`).run(dayRecord.id);
    }

    res.json({ tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get goal history/log
router.get('/:id/history', (req, res) => {
  const days = db.prepare(`
    SELECT d.*,
           COUNT(tc.id) as total_tasks,
           SUM(CASE WHEN tc.status = 'done' THEN 1 ELSE 0 END) as completed_tasks
    FROM days d
    LEFT JOIN task_completions tc ON tc.day_id = d.id
    WHERE d.goal_id = ?
    GROUP BY d.id
    ORDER BY d.date DESC
    LIMIT 90
  `).all(req.params.id);

  const metrics = db.prepare(`SELECT * FROM metrics WHERE goal_id = ? ORDER BY date DESC`).all(req.params.id);

  res.json({ days, metrics });
});

// Log a metric
router.post('/:id/metrics', (req, res) => {
  const { metric_name, value, date } = req.body;
  db.prepare(`INSERT INTO metrics (goal_id, date, metric_name, value) VALUES (?, ?, ?, ?)`)
    .run(req.params.id, date || localToday(), metric_name, String(value));
  res.json({ ok: true });
});

export default router;
