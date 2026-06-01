const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'alarm', 'success', 'error'],
    default: 'info'
  },
  imageBase64: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
