import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { seed } from './data.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import dashboardRoutes from './routes/dashboard.js';
import taskRoutes from './routes/tasks.js';
import youtubeRoutes from './routes/youtube.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : false);

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(value => value.trim());
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('This origin is not allowed by CORS.'));
}, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'mongodb' : 'disconnected' }));
app.get('/api/exams', (_req, res) => res.json(Object.entries(seed).map(([id, value]) => ({ id, name: value.full, target: value.target }))));
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/youtube-playlists', youtubeRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));

const clientDist = fileURLToPath(new URL('../client/dist', import.meta.url));
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(fileURLToPath(new URL('../client/dist/index.html', import.meta.url)), error => {
    if (error) return res.status(404).send('Client build not found. Run npm run build first.');
  });
});

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
  if (error?.name === 'ValidationError') return res.status(400).json({ error: 'Some submitted details are invalid.' });
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500) return res.status(error.status).json({ error: error.message });
  console.error(error);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

export default app;
