import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import goalsRouter from './routes/goals.js';
import pushRouter from './routes/push.js';
import dashboardRouter from './routes/dashboard.js';
import chatRouter from './routes/chat.js';

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
app.use('/api/chat', chatRouter);

// Serve built client in production
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  // Serve static files with correct MIME types for PWA files
  app.use(express.static(clientDist, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.json') && filePath.includes('manifest')) {
        res.setHeader('Content-Type', 'application/manifest+json');
      } else if (filePath.endsWith('.webmanifest')) {
        res.setHeader('Content-Type', 'application/manifest+json');
      } else if (filePath.endsWith('sw.js') || filePath.endsWith('registerSW.js')) {
        // Service workers must not be cached by the browser
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Content-Type', 'application/javascript');
      }
    },
  }));
  // Explicit route for manifest.json so it's always found regardless of static config
  app.get('/manifest.json', (req, res) => {
    const mf = path.join(clientDist, 'manifest.json');
    if (fs.existsSync(mf)) {
      res.setHeader('Content-Type', 'application/manifest+json');
      res.sendFile(mf);
    } else {
      res.status(404).json({ error: 'manifest not found' });
    }
  });
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
