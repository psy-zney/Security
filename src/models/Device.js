const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  secretKey: {
    type: String,
    required: true
  },
  ownerEmail: {
    type: String,
    required: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Device', DeviceSchema);
