import express from 'express';
import db from '../db.js';

const router = express.Router();

// Get merged daily dashboard (all active goals for the authenticated user)
router.get('/today', async (req, res) => {
  // Use local date (not UTC) so the day matches the user's timezone
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const goals = db.prepare(`SELECT * FROM goals WHERE is_active = 1 AND user_id = ?`).all(req.userId);

  const combined = [];

  for (const goal of goals) {
    const dayRecord = db.prepare(`SELECT * FROM days WHERE goal_id = ? AND date = ?`).get(goal.id, today);
    if (!dayRecord) continue;

    const completions = db.prepare(`SELECT * FROM task_completions WHERE day_id = ?`).all(dayRecord.id);
    const tasks = JSON.parse(dayRecord.tasks);

    const startDate = goal.created_at.split('T')[0].split(' ')[0];
    const dayNumber = Math.ceil((new Date(today) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    const daysUntilDeadline = Math.ceil((new Date(goal.deadline) - new Date(today)) / (1000 * 60 * 60 * 24));

    combined.push({
      goal_id: goal.id,
      goal_title: goal.title,
      goal_color: goal.color || '#EC8B43',
      phase_name: dayRecord.phase_name,
      day_number: dayNumber,
      days_until_deadline: daysUntilDeadline,
      deadline: goal.deadline,
      day_id: dayRecord.id,
      tasks: tasks.map((t, i) => {
        const c = completions.find(c => c.task_index === i);
        return {
          ...t,
          index: i,
          goal_id: goal.id,
          goal_title: goal.title,
          goal_color: goal.color || '#EC8B43',
          day_id: dayRecord.id,
          status: c?.status || 'pending',
          notification_id: c?.notification_id || null,
        };
      }),
    });
  }

  // Compute streaks per goal
  const streaks = {};
  for (const goal of goals) {
    const dayRecords = db.prepare(`
      SELECT d.date, COUNT(tc.id) as total, SUM(CASE WHEN tc.status='done' THEN 1 ELSE 0 END) as done
      FROM days d
      LEFT JOIN task_completions tc ON tc.day_id = d.id
      WHERE d.goal_id = ?
      GROUP BY d.date
      ORDER BY d.date DESC
    `).all(goal.id);

    let streak = 0;
    for (const day of dayRecords) {
      if (day.total > 0 && day.done >= day.total * 0.5) streak++;
      else break;
    }
    streaks[goal.id] = streak;
  }

  res.json({ date: today, goals: combined, streaks });
});

export default router;
