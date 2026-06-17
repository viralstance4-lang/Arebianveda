const Blog = require('../models/Blog');
const BlogCategory = require('../models/BlogCategory');
const BlogTag = require('../models/BlogTag');
const slugify = require('../utils/slugify');

function estimateReadTime(html) {
  if (!html) return '1 min read';
  const text = html.replace(/<[^>]*>/g, '');
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

exports.listBlogs = async (req, res) => {
  const { page = 1, limit = 10, category, tag, search, featured, admin, status, sort } = req.query;
  const mongoose = require('mongoose');
  const q = { isActive: true };
  const isAdminRequest = admin === 'true' && req.user && req.user.role === 'admin';

  if (!isAdminRequest) {
    q.$and = [{ $or: [{ status: 'published' }, { status: 'scheduled', publishDate: { $lte: new Date() } }] }];
  } else if (status) {
    q.status = status;
  }

  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) q.category = category;
    else q.category = await BlogCategory.findOne({ slug: category }).then(c => c?._id);
  }

  if (tag) {
    if (mongoose.Types.ObjectId.isValid(tag)) q.tags = tag;
    else q.tags = await BlogTag.findOne({ slug: tag }).then(t => t?._id);
  }

  if (featured === 'true') q.isFeatured = true;
  if (search) {
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [{ title: re }, { excerpt: re }, { content: re }];
  }

  const sortMap = {
    popular: { views: -1 },
    latest: { publishDate: -1, createdAt: -1 },
    featured: { isFeatured: -1, publishDate: -1 },
  };
  const sortOption = sortMap[sort] || { isFeatured: -1, publishDate: -1, createdAt: -1 };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Blog.find(q).sort(sortOption).skip(skip).limit(Number(limit)).populate('author', 'name').populate('category', 'name slug').populate('tags', 'name slug'),
    Blog.countDocuments(q),
  ]);

  res.json({ success: true, blogs: items, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) } });
};

exports.getBlog = async (req, res) => {
  const slugOrId = req.params.slug;
  const mongoose = require('mongoose');
  const or = [{ slug: slugOrId }];
  if (mongoose.Types.ObjectId.isValid(slugOrId)) or.push({ _id: slugOrId });

  const blog = await Blog.findOne({ $or: or, isActive: true }).populate('author', 'name').populate('category', 'name slug').populate('tags', 'name slug');
  if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });

  const isPreview = req.query.preview === 'true';
  const canView = blog.status === 'published' || isPreview || (req.user && req.user.role === 'admin');
  if (!canView) return res.status(403).json({ success: false, message: 'Blog is not published yet' });

  if (blog.status === 'published' && !isPreview) {
    Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } }).exec().catch(() => {});
  }

  const related = await Blog.find({
    _id: { $ne: blog._id },
    isActive: true,
    status: 'published',
    $or: [{ category: blog.category }, { tags: { $in: blog.tags } }],
  }).limit(4).select('title slug excerpt featuredImage publishDate');

  const prevBlog = await Blog.findOne({
    isActive: true,
    status: 'published',
    publishDate: { $lt: blog.publishDate || blog.createdAt },
  }).sort({ publishDate: -1, createdAt: -1 }).select('title slug');

  const nextBlog = await Blog.findOne({
    isActive: true,
    status: 'published',
    publishDate: { $gt: blog.publishDate || blog.createdAt },
  }).sort({ publishDate: 1, createdAt: 1 }).select('title slug');

  res.json({ success: true, blog, related, prevBlog, nextBlog });
};

exports.getBlogById = async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  const blog = await Blog.findById(req.params.id).populate('author', 'name').populate('category', 'name slug').populate('tags', 'name slug');
  if (!blog || !blog.isActive) return res.status(404).json({ success: false, message: 'Blog not found' });
  res.json({ success: true, blog });
};

exports.duplicateBlog = async (req, res) => {
  const source = await Blog.findById(req.params.id);
  if (!source) return res.status(404).json({ success: false, message: 'Blog not found' });
  const duplicateData = source.toObject();
  delete duplicateData._id;
  delete duplicateData.createdAt;
  delete duplicateData.updatedAt;
  duplicateData.title = `${duplicateData.title} (Copy)`;
  duplicateData.status = 'draft';
  duplicateData.slug = `${duplicateData.slug || slugify(duplicateData.title)}-${Date.now()}`;
  if (req.user) duplicateData.author = req.user._id;
  const duplicated = await Blog.create(duplicateData);
  res.status(201).json({ success: true, blog: duplicated });
};

exports.createBlog = async (req, res) => {
  // Attach author from req.user
  const data = { ...req.body };
  if (req.user) data.author = req.user._id;
  data.readTime = estimateReadTime(data.content || '');
  const blog = await Blog.create(data);
  res.status(201).json({ success: true, blog });
};

exports.updateBlog = async (req, res) => {
  const data = { ...req.body };
  if (data.content) data.readTime = estimateReadTime(data.content);
  const blog = await Blog.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
  res.json({ success: true, blog });
};

exports.deleteBlog = async (req, res) => {
  const blog = await Blog.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
  res.json({ success: true, message: 'Blog deactivated' });
};

exports.uploadImages = async (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: 'No files uploaded' });
  const backendOrigin = `${req.protocol}://${req.get('host')}`;
  const files = req.files.map(f => ({ url: f.path?.startsWith('http') ? f.path : `${backendOrigin}/uploads/media/${f.filename}`, public_id: f.filename }));
  res.json({ success: true, files });
};

exports.relatedBlogs = async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json({ success: false, message: 'Blog not found' });
  const related = await Blog.find({
    _id: { $ne: blog._id },
    isActive: true,
    $or: [ { category: blog.category }, { tags: { $in: blog.tags } } ],
    status: 'published',
  }).limit(4).select('title slug excerpt featuredImage publishDate');
  res.json({ success: true, related });
};

// Sitemap (simple): returns XML listing of blog URLs
exports.sitemap = async (req, res) => {
  const siteRoot = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
  const posts = await Blog.find({ isActive: true, status: 'published' }).select('slug updatedAt publishDate');
  const urls = posts.map(p => ({ loc: `${siteRoot}/blog/${p.slug}`, lastmod: (p.publishDate || p.updatedAt).toISOString() }));
  res.header('Content-Type', 'application/xml');
  const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`), '</urlset>'].join('\n');
  res.send(xml);
};
