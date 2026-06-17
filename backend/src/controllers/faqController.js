const FAQ = require('../models/FAQ');

// GET /api/faqs — public, only active FAQs
exports.getAllFaqs = async (req, res) => {
  const faqs = await FAQ.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
  res.json({ success: true, faqs });
};

// GET /api/faqs/admin — admin, all FAQs regardless of status
exports.getAllFaqsAdmin = async (req, res) => {
  const faqs = await FAQ.find().sort({ order: 1, createdAt: 1 });
  res.json({ success: true, faqs });
};

// POST /api/faqs — admin
exports.createFaq = async (req, res) => {
  const { question, answer, order, isActive } = req.body;
  if (!question?.trim() || !answer?.trim()) {
    return res.status(400).json({ success: false, message: 'Question and answer are required' });
  }
  const faq = await FAQ.create({ question, answer, order: order ?? 0, isActive: isActive ?? true });
  res.status(201).json({ success: true, faq });
};

// PUT /api/faqs/:id — admin
exports.updateFaq = async (req, res) => {
  const { question, answer, order, isActive } = req.body;
  const faq = await FAQ.findByIdAndUpdate(
    req.params.id,
    { question, answer, order, isActive },
    { new: true, runValidators: true }
  );
  if (!faq) return res.status(404).json({ success: false, message: 'FAQ not found' });
  res.json({ success: true, faq });
};

// DELETE /api/faqs/:id — admin
exports.deleteFaq = async (req, res) => {
  const faq = await FAQ.findByIdAndDelete(req.params.id);
  if (!faq) return res.status(404).json({ success: false, message: 'FAQ not found' });
  res.json({ success: true, message: 'FAQ deleted' });
};
