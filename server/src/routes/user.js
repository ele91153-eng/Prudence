import express from 'express';
import db from '../db.js';

const router = express.Router();

function rowFor(userId) {
  let row = db.prepare(`SELECT * FROM user_mascot_state WHERE user_id = ?`).get(userId);
  if (!row) {
    db.prepare(`INSERT INTO user_mascot_state (user_id) VALUES (?)`).run(userId);
    row = db.prepare(`SELECT * FROM user_mascot_state WHERE user_id = ?`).get(userId);
  }
  return row;
}

// Get this user's wardrobe/streak state
router.get('/mascot-state', (req, res) => {
  const row = rowFor(req.userId);
  res.json({
    selected_mascot_id: row.selected_mascot_id,
    unlocked_mascots: JSON.parse(row.unlocked_mascots || '["prudence"]'),
    max_streak: row.max_streak,
  });
});

// Update mascot selection / unlocks / streak (partial updates supported)
router.post('/mascot-state', (req, res) => {
  rowFor(req.userId); // ensure a row exists
  const { selected_mascot_id, unlocked_mascots, max_streak } = req.body;

  db.prepare(`
    UPDATE user_mascot_state SET
      selected_mascot_id = COALESCE(?, selected_mascot_id),
      unlocked_mascots = COALESCE(?, unlocked_mascots),
      max_streak = CASE WHEN ? IS NOT NULL AND ? > max_streak THEN ? ELSE max_streak END,
      updated_at = datetime('now')
    WHERE user_id = ?
  `).run(
    selected_mascot_id ?? null,
    unlocked_mascots ? JSON.stringify(unlocked_mascots) : null,
    max_streak ?? null, max_streak ?? null, max_streak ?? null,
    req.userId
  );

  res.json({ ok: true });
});

// One-time seed from client localStorage on first anonymous sign-in.
// No-ops (and reports seeded:false) if this user already has server-side
// state, so it never clobbers real progress on repeat calls.
router.post('/mascot-state/seed', (req, res) => {
  const existing = db.prepare(`SELECT * FROM user_mascot_state WHERE user_id = ?`).get(req.userId);
  if (existing) return res.json({ seeded: false });

  const { selected_mascot_id, unlocked_mascots, max_streak } = req.body;
  db.prepare(`
    INSERT INTO user_mascot_state (user_id, selected_mascot_id, unlocked_mascots, max_streak)
    VALUES (?, ?, ?, ?)
  `).run(
    req.userId,
    selected_mascot_id || 'prudence',
    JSON.stringify(unlocked_mascots || ['prudence']),
    max_streak || 0
  );
  res.json({ seeded: true });
});

export default router;
