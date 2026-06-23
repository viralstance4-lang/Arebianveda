const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
  },
  tagline: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  categories: {
    type: [String],
    default: [],
  },
  categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  // Ayurvedic specific fields
  concerns: { type: [String], default: [] }, // labels from Concern collection, e.g. "Sugar Management", "Skin & Hair"
  keyHerbs: [String],        // ["Shilajit", "Ashwagandha", "Triphala"]
  forms: {
    type: [String],
    enum: ['resin', 'capsule', 'powder', 'liquid', 'lump', 'tablet', 'oil', 'other'],
    default: [],
  },
  ayurvedicType: String,     // "Rasayana", "Kwath", "Churna"
  dosage: String,            // "Take 1 capsule twice daily with warm milk"
  suitableFor: [String],     // ["Men", "Women", "Elderly"]
  certifications: [String],  // ["FSSAI", "GMP", "ISO", "Organic", "Vegan"]

  // Product variants (e.g. 10g / 20g / 30 Capsules)
  variants: [
    {
      label: String,
      price: Number,
      comparePrice: Number,
      stock: { type: Number, default: 0 },
    },
  ],

  // Package/multi-pack pricing (e.g. "Pack of 1/2/3/5"). Quantity acts as a
  // stock multiplier — buying 1x "Pack of 3" deducts 3 units from `stock`.
  packageVariants: [
    {
      label: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0.01 },
      comparePrice: Number,
      sku: String,
      isDefault: { type: Boolean, default: false },
    },
  ],
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  comparePrice: {
    type: Number,
    min: 0,
  },
  costPrice: Number, // for profit analytics

  // ── Structured discount (optional — admin can use these instead of manually setting price) ──
  discountType: {
    type: String,
    enum: ['none', 'percentage', 'fixed'],
    default: 'none',
  },
  discountValue: { type: Number, default: 0, min: 0 },
  images: [
    {
      url: { type: String, required: true },
      public_id: String,
      alt: String,
    },
  ],
  benefits: [
    {
      title: String,
      description: String,
      icon: String,
    },
  ],
  ingredients: [String],
  howToUse: String,
  beforeAfter: {
    before: String,
    after: String,
  },
  stock: {
    type: Number,
    default: 50,
    min: 0,
  },
  sold: {
    type: Number,
    default: 0,
  },
  weight: Number, // in grams
  dimensions: String,
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isBestseller: { type: Boolean, default: false },
  tags: [String],
  seoTitle: String,
  seoDescription: String,
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
  },
  upsells: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
}, { timestamps: true });

// Auto-generate slug + auto-compute price from structured discount
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // If admin set a structured discount and there is a comparePrice (MRP), compute price
  if (this.discountType !== 'none' && this.comparePrice > 0) {
    if (this.discountType === 'percentage') {
      const pct = Math.min(this.discountValue, 99); // cap at 99%
      this.price = Math.round(this.comparePrice * (1 - pct / 100));
    } else if (this.discountType === 'fixed') {
      const fixed = Math.min(this.discountValue, this.comparePrice - 1); // price must be ≥ 1
      this.price = Math.max(1, this.comparePrice - fixed);
    }
  }
  next();
});

// Discount percentage virtual
productSchema.virtual('discountPercent').get(function () {
  if (!this.comparePrice) return 0;
  return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100);
});

productSchema.set('toJSON', { virtuals: true });

productSchema.index({ isActive: 1, isFeatured: -1, createdAt: -1 });
productSchema.index({ isActive: 1, categories: 1 });
productSchema.index({ isActive: 1, isBestseller: 1 });
productSchema.index({ isActive: 1, concerns: 1 });
productSchema.index({ name: 'text', description: 'text', keyHerbs: 'text' });

module.exports = mongoose.model('Product', productSchema);
