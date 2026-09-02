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
app.use(cors());
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

// More routers will be mounted here as you build them out (Day 9+ is frontend):
// import expensesRouter from './routes/expenses.js'; // PUT/DELETE /api/expenses/:id if you add it later

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  try {
    await testConnection();
  } catch (err) {
    console.error('Postgres connection failed:', err.message);
    console.error('Check your DATABASE_URL in .env');
  }
});
