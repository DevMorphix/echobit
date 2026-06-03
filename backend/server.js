import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import recordingsRoutes from './routes/recordings.js';
import adminRoutes from './routes/admin.js';
import paymentsRoutes from './routes/payments.js';
import { authenticateToken } from './middleware/auth.js';
import PlanConfig from './models/PlanConfig.js';

// Connect to MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - Allow configured origins (comma-separated ALLOWED_ORIGINS env var, falls back to localhost in dev)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Same-origin or non-browser clients (mobile app, curl, etc.)
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

// Default features seeded on first request if DB has none
const DEFAULT_FEATURES = {
  free: [
    { text: '3 recordings / month', included: true },
    { text: 'AI transcription (English + Malayalam)', included: true },
    { text: 'Basic AI summary', included: true },
    { text: 'AI notes', included: false },
    { text: 'PDF export', included: false },
    { text: 'Meeting minutes', included: false },
  ],
  starter: [
    { text: '15 recordings / month', included: true },
    { text: 'AI transcription (English + Hindi + Malayalam)', included: true },
    { text: 'AI summary + notes', included: true },
    { text: 'PDF export', included: false },
    { text: 'Meeting minutes', included: false },
    { text: 'Priority processing', included: false },
  ],
  pro: [
    { text: '40 recordings / month', included: true },
    { text: 'AI transcription (15+ languages)', included: true },
    { text: 'AI summary + meeting minutes', included: true },
    { text: 'Action item extraction', included: true },
    { text: 'PDF export', included: true },
    { text: 'Priority processing', included: true },
  ],
  growth: [
    { text: 'Unlimited recordings', included: true },
    { text: 'AI transcription (20+ languages)', included: true },
    { text: 'Everything in Pro', included: true },
    { text: 'Priority processing + support', included: true },
    { text: '25 GB storage', included: true },
    { text: 'Team workspace', included: true },
  ],
  team: [
    { text: 'Unlimited recordings', included: true },
    { text: 'All 11 Indian languages', included: true },
    { text: 'AI summaries + meeting minutes', included: true },
    { text: 'PDF export', included: true },
    { text: 'Team workspace', included: true },
    { text: 'Priority support', included: true },
  ],
};

// Public: get plan features (used by pricing pages)
app.get('/api/plans', async (req, res) => {
  try {
    const configs = await PlanConfig.find().lean();
    const result = {};
    for (const plan of ['free', 'starter', 'pro', 'growth', 'team']) {
      const found = configs.find(c => c.plan === plan);
      result[plan] = found ? found.features : DEFAULT_FEATURES[plan];
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load plan features' });
  }
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/recordings', authenticateToken, recordingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    dbState: mongoose.connection.readyState
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`); 
});



