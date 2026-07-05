import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

// One-time migration: the app was single-tenant before this auth layer existed,
// so all pre-existing goals have user_id = NULL. The first authenticated request
// after deploy claims them for that user, then never runs again.
function claimLegacyDataIfNeeded(userId) {
  const alreadyClaimed = db.prepare(`SELECT value FROM app_meta WHERE key = 'legacy_claimed'`).get();
  if (alreadyClaimed) return;
  db.prepare(`UPDATE goals SET user_id = ? WHERE user_id IS NULL`).run(userId);
  db.prepare(`INSERT INTO app_meta (key, value) VALUES ('legacy_claimed', ?)`).run(userId);
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Missing auth token' });
  if (!JWT_SECRET) {
    console.error('SUPABASE_JWT_SECRET is not set — cannot verify auth tokens');
    return res.status(500).json({ error: 'Server auth not configured' });
  }

  try {
    // Supabase issues HS256 JWTs signed with the project's JWT secret
    // (Project Settings → API → JWT Secret in the Supabase dashboard).
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.userId = payload.sub;
    claimLegacyDataIfNeeded(req.userId);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Confirms a goal belongs to the requesting user before mutating anything
// scoped underneath it (tasks, status, edits, metrics, history).
export function ownsGoal(goalId, userId) {
  const goal = db.prepare(`SELECT id FROM goals WHERE id = ? AND user_id = ?`).get(goalId, userId);
  return !!goal;
}
