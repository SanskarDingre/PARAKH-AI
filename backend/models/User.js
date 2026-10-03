const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, default: 'User' },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  passwordHash: { type: String, required: true },
  role: {
  type: String,
  enum: ['admin', 'inspector', 'officer', 'reviewer', 'viewer'],
  default: 'viewer',
},
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
