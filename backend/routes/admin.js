const express = require('express');
const User = require('../models/User');
const RuleSet = require('../models/RuleSet');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes require a valid token + admin role
router.use(verifyToken, requireRole('admin'));

// GET /api/admin/users — list all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Could not load users' });
  }
});

// PATCH /api/admin/users/:id/role — change a user's role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['viewer', 'officer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, select: '-passwordHash' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Could not update role' });
  }
});

// GET /api/admin/ruleset — get active rule set
router.get('/ruleset', async (req, res) => {
  try {
    const ruleSet = await RuleSet.findOne({ isActive: true });
    if (!ruleSet) return res.status(404).json({ error: 'No active rule set' });
    res.json(ruleSet);
  } catch (err) {
    res.status(500).json({ error: 'Could not load rule set' });
  }
});

// GET /api/admin/audit — recent audit log
router.get('/audit', async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Could not load audit log' });
  }
});

module.exports = router;
