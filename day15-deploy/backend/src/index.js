import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/db.js';
import authRouter from './routes/auth.js';
import groupsRouter from './routes/groups.js';
import settlementsRouter from './routes/settlements.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();

// In local dev, CORS_ORIGIN is unset so this falls back to allowing
// everything. In production (Render), set CORS_ORIGIN to your Vercel URL —
// see the Day 15 deployment steps.
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.use('/api/groups', groupsRouter);
app.use('/api/settlements', settlementsRouter);

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await testConnection();
  } catch (err) {
    console.error('Postgres connection failed:', err.message);
    console.error('Check your DATABASE_URL in .env');
  }
});
