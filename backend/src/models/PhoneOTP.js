const mongoose = require('mongoose');

const phoneOTPSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    match: [/^[6-9]\d{9}$/, 'Invalid Indian phone number'],
  },
  otp: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // MongoDB TTL index — document auto-deleted after 10 minutes
    expires: 600,
  },
});

// Prevent multiple OTP docs for the same phone; always upsert
phoneOTPSchema.index({ phone: 1 }, { unique: true });

module.exports = mongoose.model('PhoneOTP', phoneOTPSchema);
