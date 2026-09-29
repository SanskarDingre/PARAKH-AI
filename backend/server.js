require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const inspectRoutes = require('./routes/inspect');
const inspectionsRoutes = require('./routes/inspections');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
// New multi-image inspection API (primary)
app.use('/api/inspections', inspectionsRoutes);

// Legacy single-image inspect API (kept for backward compatibility)
app.use('/api', inspectRoutes);

// Auth + Admin
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'Parakh AI backend is running',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      inspections: '/api/inspections',
      legacy: '/api/inspect',
      admin: '/api/admin',
    },
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── DB connection ─────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection failed:', err.message));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Parakh AI backend running on http://localhost:${PORT}`);
  console.log(`   OCR service expected at: ${process.env.OCR_SERVICE_URL}`);
});