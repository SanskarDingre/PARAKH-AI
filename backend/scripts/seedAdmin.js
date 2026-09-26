require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error('Set ADMIN_USERNAME and ADMIN_PASSWORD in your .env file first.');
    process.exit(1);
  }

  const existing = await User.findOne({ username });
  if (existing) {
    console.log('Admin user already exists.');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ username, passwordHash, role: 'admin' });
  console.log(`Admin user "${username}" created successfully.`);
  process.exit(0);
}

seed();
