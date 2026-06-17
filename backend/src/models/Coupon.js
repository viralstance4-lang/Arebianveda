const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: { type: String, default: '' },

    // ── Discount ──────────────────────────────────────────────────────────────
    discountType:  { type: String, enum: ['percentage', 'fixed', 'free_gift'], required: true },
    discountValue: { type: Number, required: true, min: 0, default: 0 },

    // ── Free gift (only used when discountType === 'free_gift') ──────────────
    giftProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },

    // ── Application mode ──────────────────────────────────────────────────────
    // 'auto'   — applied automatically once the cart qualifies (no code entry)
    // 'manual' — customer must enter the coupon code
    applicationMode: { type: String, enum: ['auto', 'manual'], default: 'manual' },

    // ── Rules ─────────────────────────────────────────────────────────────────
    minOrderValue:     { type: Number, default: 0 },   // minimum cart subtotal to apply
    maxDiscountAmount: { type: Number, default: 0 },   // cap for % discounts (0 = no cap)

    // ── Lifecycle ─────────────────────────────────────────────────────────────
    isActive:   { type: Boolean, default: true },
    usageLimit: { type: Number, default: 0 },          // 0 = unlimited
    usedCount:  { type: Number, default: 0 },
    expiresAt:  { type: Date },                        // undefined = no expiry
  },
  { timestamps: true }
);

// Computed virtual: remaining uses
couponSchema.virtual('usageRemaining').get(function () {
  if (this.usageLimit === 0) return null; // unlimited
  return Math.max(0, this.usageLimit - this.usedCount);
});

couponSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Coupon', couponSchema);
