const mongoose = require('mongoose');

// Singleton document — only one record ever exists (use findOneAndUpdate + upsert).
// Controls which payment methods are offered at checkout, plus the
// advance/COD split used when "Partial COD" is enabled.
const paymentSettingsSchema = new mongoose.Schema(
  {
    codEnabled:        { type: Boolean, default: true },
    onlineEnabled:     { type: Boolean, default: true },
    partialCodEnabled: { type: Boolean, default: false },

    // Partial COD split — advancePercentage + codPercentage always total 100
    advancePercentage: { type: Number, default: 20, min: 1, max: 99 },
    codPercentage:     { type: Number, default: 80, min: 1, max: 99 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentSettings', paymentSettingsSchema);
