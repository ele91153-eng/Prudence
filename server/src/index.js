import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import goalsRouter from './routes/goals.js';
import pushRouter from './routes/push.js';
import dashboardRouter from './routes/dashboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Allow any Render subdomain, localhost, and an explicit CLIENT_ORIGIN override
const allowedOrigins = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https:\/\/.*\.onrender\.com$/,
  ...(process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : []),
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin / server-side requests
    const ok = allowedOrigins.some(p => typeof p === 'string' ? p === origin : p.test(origin));
    cb(ok ? null : new Error('Not allowed by CORS'), ok);
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/goals', goalsRouter);
app.use('/api/push', pushRouter);
app.use('/api/dashboard', dashboardRouter);

// Serve built client in production
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

// Global JSON error handler — must be after all routes
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
