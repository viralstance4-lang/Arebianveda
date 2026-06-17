const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
  excerpt: { type: String, default: '' },
  featuredImage: { type: String, default: '' },
  gallery: [String],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogCategory' },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BlogTag' }],
  content: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'published', 'scheduled'], default: 'draft' },
  publishDate: { type: Date },
  meta: {
    title: String,
    description: String,
    focusKeyword: String,
    canonicalUrl: String,
    robots: { type: String, default: 'index, follow' },
  },
  og: {
    title: String,
    description: String,
    image: String,
  },
  views: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  readTime: { type: String, default: '' },
}, { timestamps: true });

blogSchema.pre('save', function (next) {
  if (this.isModified('title') || !this.slug) this.slug = slugify(this.title || 'untitled');
  // ensure publishDate exists for published posts
  if (this.status === 'published' && !this.publishDate) this.publishDate = new Date();
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
