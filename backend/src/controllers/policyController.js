const Policy = require('../models/Policy');

// Public: all active policies (for footer links)
exports.getPublicPolicies = async (req, res) => {
  const policies = await Policy.find({ isActive: true })
    .select('title slug order')
    .sort({ order: 1, createdAt: 1 });
  res.json({ success: true, policies });
};

// Public: single policy by slug (for policy page)
exports.getPolicyBySlug = async (req, res) => {
  const policy = await Policy.findOne({ slug: req.params.slug, isActive: true });
  if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });
  res.json({ success: true, policy });
};

// Admin: all policies
exports.getAllPolicies = async (req, res) => {
  const policies = await Policy.find().sort({ order: 1, createdAt: 1 });
  res.json({ success: true, policies });
};

// Admin: create
exports.createPolicy = async (req, res) => {
  const policy = await Policy.create(req.body);
  res.status(201).json({ success: true, policy });
};

// Admin: update
exports.updatePolicy = async (req, res) => {
  const policy = await Policy.findById(req.params.id);
  if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

  // If title changed, pre-save will regenerate slug
  Object.assign(policy, req.body);
  await policy.save();
  res.json({ success: true, policy });
};

// Admin: delete
exports.deletePolicy = async (req, res) => {
  await Policy.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Policy deleted' });
};
