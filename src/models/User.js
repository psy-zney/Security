const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: false // Optional for Google OAuth users
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  googleId: {
    type: String,
    required: false
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
