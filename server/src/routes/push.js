import express from 'express';
import webpush from 'web-push';
import db from '../db.js';

const router = express.Router();

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:' + (process.env.VAPID_EMAIL || 'admin@goalcoach.app'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

router.get('/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || '' });
});

router.post('/subscribe', (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys) return res.status(400).json({ error: 'Missing endpoint or keys' });

  db.prepare(`
    INSERT INTO push_subscriptions (endpoint, keys)
    VALUES (?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET keys = excluded.keys
  `).run(endpoint, JSON.stringify(keys));

  res.json({ ok: true });
});

router.post('/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).run(endpoint);
  res.json({ ok: true });
});

// Send a test notification
router.post('/test', async (req, res) => {
  const subs = db.prepare(`SELECT * FROM push_subscriptions`).all();
  const payload = JSON.stringify({ title: 'Goal Coach', body: 'Notifications are working!' });

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: JSON.parse(sub.keys) }, payload)
    )
  );

  res.json({ sent: results.filter(r => r.status === 'fulfilled').length });
});

export default router;
