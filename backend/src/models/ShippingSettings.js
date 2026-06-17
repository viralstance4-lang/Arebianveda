const mongoose = require('mongoose');

// Singleton document — only one record ever exists (use findOneAndUpdate + upsert)
const shippingSettingsSchema = new mongoose.Schema(
  {
    // ── Prepaid (online payment) ──────────────────────────────────────────────
    prepaidFreeThreshold: { type: Number, default: 499 }, // subtotal >= this → free shipping
    prepaidCharge:        { type: Number, default: 79  }, // charge when subtotal < threshold

    // ── COD ───────────────────────────────────────────────────────────────────
    // COD never has "free" shipping — just a higher vs lower surcharge
    codEnabled:     { type: Boolean, default: true }, // global ON/OFF — admin toggles from Settings
    codThreshold:   { type: Number,  default: 499  }, // subtotal threshold for COD tiers
    codChargeBelow: { type: Number,  default: 79   }, // COD charge when subtotal < threshold
    codChargeAbove: { type: Number,  default: 20   }, // COD charge when subtotal >= threshold
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShippingSettings', shippingSettingsSchema);

// ─── Site Settings (singleton) ────────────────────────────────────────────────
// Stores the global site logo + size. Only ONE document ever exists.
const siteSettingsSchema = new mongoose.Schema(
  {
    logoUrl:    { type: String, default: '' },
    logoWidth:  { type: String, default: '120px' },
    logoHeight: { type: String, default: 'auto' },
    logoAlt:    { type: String, default: 'Arebianveda' },
  },
  { timestamps: true }
);

module.exports.SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);
