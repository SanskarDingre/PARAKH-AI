const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Otp = require('../models/Otp');

const router = express.Router();

function isEmail(identifier) {
  return /\S+@\S+\.\S+/.test(identifier);
}

async function sendOtpEmail(email, code) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Parakh AI login code',
    text: `Your one-time login code is: ${code}. It expires in 5 minutes.`,
  });
}

router.post('/register', async (req, res) => {
  try {
    let { name, email, phone, password } = req.body;
    email = email && email.trim() !== '' ? email.trim().toLowerCase() : undefined;
    phone = phone && phone.trim() !== '' ? phone.trim() : undefined;

    if (!name || !password || (!email && !phone)) {
      return res.status(400).json({ error: 'Name, password, and either email or phone are required.' });
    }

    const orConditions = [];
    if (email) orConditions.push({ email });
    if (phone) orConditions.push({ phone });

    const existing = await User.findOne({ $or: orConditions });
    if (existing) return res.status(409).json({ error: 'An account with this email or phone already exists.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, phone, passwordHash, role: 'viewer' });

    res.status(201).json({ message: 'Account created. You can now log in.', user: { name: user.name, role: user.role } });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/phone and password are required.' });
    }
    const user = await User.findOne({ $or: [{ email: identifier.toLowerCase() }, { phone: identifier }] });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/otp/request', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ error: 'Email or phone is required.' });

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await Otp.deleteMany({ identifier });
    await Otp.create({ identifier, code, expiresAt });

    if (isEmail(identifier)) {
      await sendOtpEmail(identifier, code);
      return res.json({ message: 'OTP sent to your email.' });
    } else {
      console.log(`[DEMO ONLY — no SMS provider configured] OTP for ${identifier}: ${code}`);
      return res.json({ message: 'No SMS provider is configured yet — check the backend terminal for your code.' });
    }
  } catch (error) {
    console.error('OTP request error:', error.message);
    res.status(500).json({ error: 'Could not send OTP.' });
  }
});

router.post('/otp/verify', async (req, res) => {
  try {
    const { identifier, code } = req.body;
    const record = await Otp.findOne({ identifier, code });
    if (!record) return res.status(401).json({ error: 'Invalid OTP.' });
    if (record.expiresAt < new Date()) return res.status(401).json({ error: 'OTP expired.' });

    await Otp.deleteMany({ identifier });

    const isEmailId = isEmail(identifier);
    let user = await User.findOne(isEmailId ? { email: identifier.toLowerCase() } : { phone: identifier });
    if (!user) {
      user = await User.create({
        name: identifier,
        email: isEmailId ? identifier.toLowerCase() : undefined,
        phone: !isEmailId ? identifier : undefined,
        passwordHash: 'otp-only-no-password',
        role: 'viewer',
      });
    }

    const token = jwt.sign({ id: user._id, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { name: user.name, role: user.role } });
  } catch (error) {
    console.error('OTP verify error:', error.message);
    res.status(500).json({ error: 'Could not verify OTP.' });
  }
});

module.exports = router;
