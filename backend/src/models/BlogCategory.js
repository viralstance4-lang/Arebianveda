const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const blogCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
  description: String,
  status: { type: String, enum: ['draft', 'published'], default: 'published' },
}, { timestamps: true });

blogCategorySchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) this.slug = slugify(this.name);
  next();
});

module.exports = mongoose.model('BlogCategory', blogCategorySchema);
