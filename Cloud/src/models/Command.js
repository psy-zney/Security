const mongoose = require('mongoose');

const CommandSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  command: {
    type: String,
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  queuedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Command', CommandSchema);
