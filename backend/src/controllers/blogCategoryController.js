const BlogCategory = require('../models/BlogCategory');

exports.listCategories = async (_req, res) => {
  const cats = await BlogCategory.find().sort({ name: 1 });
  res.json({ success: true, categories: cats });
};

exports.createCategory = async (req, res) => {
  const cat = await BlogCategory.create(req.body);
  res.status(201).json({ success: true, category: cat });
};

exports.updateCategory = async (req, res) => {
  const cat = await BlogCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, category: cat });
};

exports.deleteCategory = async (req, res) => {
  const cat = await BlogCategory.findByIdAndDelete(req.params.id);
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, message: 'Category removed' });
};
