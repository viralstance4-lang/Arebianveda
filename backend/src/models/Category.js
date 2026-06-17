const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
  },
  description: String,
  emoji: { type: String, default: '✨' },
  color: { type: String, default: '#D4AF37' },
  imageUrl: String,
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'published',
  },
  order: { type: Number, default: 0 },
}, { timestamps: true });

// Always regenerate slug when name changes (or on first save if slug missing)
categorySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = slugify(this.name);
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
