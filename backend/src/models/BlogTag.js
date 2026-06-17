const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const blogTagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
}, { timestamps: true });

blogTagSchema.pre('save', function (next) {
  if (this.isModified('name') || !this.slug) this.slug = slugify(this.name);
  next();
});

module.exports = mongoose.model('BlogTag', blogTagSchema);
