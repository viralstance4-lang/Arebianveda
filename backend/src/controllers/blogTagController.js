const BlogTag = require('../models/BlogTag');

exports.listTags = async (_req, res) => {
  const tags = await BlogTag.find().sort({ name: 1 });
  res.json({ success: true, tags });
};

exports.createTag = async (req, res) => {
  const tag = await BlogTag.create(req.body);
  res.status(201).json({ success: true, tag });
};

exports.updateTag = async (req, res) => {
  const tag = await BlogTag.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!tag) return res.status(404).json({ success: false, message: 'Tag not found' });
  res.json({ success: true, tag });
};

exports.deleteTag = async (req, res) => {
  const tag = await BlogTag.findByIdAndDelete(req.params.id);
  if (!tag) return res.status(404).json({ success: false, message: 'Tag not found' });
  res.json({ success: true, message: 'Tag removed' });
};
