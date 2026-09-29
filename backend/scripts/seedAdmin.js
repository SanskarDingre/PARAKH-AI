require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const adminEmail = process.env.ADMIN_USERNAME + '@parakh.ai';
  const password = process.env.ADMIN_PASSWORD;

  if (!process.env.ADMIN_USERNAME || !password) {
    console.error('Set ADMIN_USERNAME and ADMIN_PASSWORD in your .env file first.');
    process.exit(1);
  }

  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    // Promote to admin if not already
    if (existing.role !== 'admin') {
      await User.findByIdAndUpdate(existing._id, { role: 'admin' });
      console.log(`Promoted "${adminEmail}" to admin.`);
    } else {
      console.log(`Admin user "${adminEmail}" already exists.`);
    }
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({
    name: 'Admin',
    email: adminEmail,
    passwordHash,
    role: 'admin',
  });
  console.log(`Admin user "${adminEmail}" created. Login with password from .env`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
