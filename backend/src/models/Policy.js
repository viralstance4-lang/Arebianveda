const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  slug:     { type: String, unique: true, lowercase: true },
  content:  { type: String, default: '' }, // HTML from rich-text editor
  isActive: { type: Boolean, default: true },
  order:    { type: Number, default: 0 },
}, { timestamps: true });

policySchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

module.exports = mongoose.model('Policy', policySchema);
