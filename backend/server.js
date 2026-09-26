require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const inspectRoutes = require('./routes/inspect');
const authRoutes = require('./routes/auth');


const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', inspectRoutes);
app.use('/api/auth', authRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection failed:', err.message));

app.get('/', (req, res) => {
  res.json({ status: 'Backend is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});