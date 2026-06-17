const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Subscriber = require('../models/Subscriber');

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// Get all customers (registered users + guest buyers + newsletter subscribers)
router.get('/customers', async (req, res) => {
  const { page = 1, limit = 20, search, type } = req.query;
  const searchRe = search ? new RegExp(search, 'i') : null;

  // ── 1. Registered users ───────────────────────────────────────────────────
  const userQuery = { role: 'user' };
  if (searchRe) userQuery.$or = [{ name: searchRe }, { email: searchRe }];
  const registeredUsers = await User.find(userQuery).select('-password').lean();

  // Attach order stats for registered users
  const registeredEmails = new Set(registeredUsers.map(u => u.email));
  const userIds = registeredUsers.map(u => u._id);
  const userOrderStats = await Order.aggregate([
    { $match: { user: { $in: userIds } } },
    { $group: { _id: '$user', orderCount: { $sum: 1 }, totalSpent: { $sum: '$total' } } },
  ]);
  const statsMap = {};
  userOrderStats.forEach(s => { statsMap[s._id.toString()] = s; });

  const registeredEntries = registeredUsers.map(u => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone || '',
    createdAt: u.createdAt,
    type: 'registered',
    orderCount: statsMap[u._id.toString()]?.orderCount || 0,
    totalSpent: statsMap[u._id.toString()]?.totalSpent || 0,
  }));

  // ── 2. Guest buyers (from orders, deduplicated by email) ──────────────────
  const guestOrders = await Order.aggregate([
    { $match: { $or: [{ user: null }, { user: { $exists: false } }], 'guestInfo.email': { $exists: true, $ne: '' } } },
    {
      $group: {
        _id: { $toLower: '$guestInfo.email' },
        name:       { $first: '$guestInfo.name' },
        phone:      { $first: '$guestInfo.phone' },
        createdAt:  { $min: '$createdAt' },
        orderCount: { $sum: 1 },
        totalSpent: { $sum: '$total' },
      },
    },
  ]);

  const guestEntries = guestOrders
    .filter(g => !registeredEmails.has(g._id)) // skip if already in registered
    .filter(g => !searchRe || searchRe.test(g._id) || searchRe.test(g.name || ''))
    .map(g => ({
      _id: `guest_${g._id}`,
      name: g.name || 'Guest',
      email: g._id,
      phone: g.phone || '',
      createdAt: g.createdAt,
      type: 'guest',
      orderCount: g.orderCount,
      totalSpent: g.totalSpent,
    }));

  // ── 3. Newsletter subscribers (not already in above sets) ─────────────────
  const allBuyerEmails = new Set([
    ...registeredEmails,
    ...guestEntries.map(g => g.email),
  ]);
  const subQuery = { status: 'active' };
  if (searchRe) subQuery.$or = [{ email: searchRe }, { name: searchRe }];
  const subscribers = await Subscriber.find(subQuery).lean();

  const subscriberEntries = subscribers
    .filter(s => !allBuyerEmails.has(s.email))
    .map(s => ({
      _id: s._id,
      name: s.name || '',
      email: s.email,
      phone: '',
      createdAt: s.createdAt,
      type: 'subscriber',
      orderCount: 0,
      totalSpent: 0,
    }));

  // ── Merge + filter by type ────────────────────────────────────────────────
  let all = [...registeredEntries, ...guestEntries, ...subscriberEntries];
  if (type && type !== 'all') all = all.filter(c => c.type === type);

  // Sort newest first
  all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = all.length;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;
  const customers = all.slice(skip, skip + limitNum);

  res.json({ success: true, customers, total, pages: Math.ceil(total / limitNum) });
});

// Get customer detail
router.get('/customers/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
});

// Inventory summary
router.get('/inventory', async (req, res) => {
  const products = await Product.find({ isActive: true }).select('name stock sold categories');
  const lowStock = products.filter(p => p.stock <= 5);
  res.json({ success: true, products, lowStock });
});

// Analytics: top selling products
router.get('/analytics/top-products', async (req, res) => {
  const products = await Product.find({ isActive: true })
    .sort({ sold: -1 })
    .limit(5)
    .select('name categories sold price images');
  res.json({ success: true, products });
});

module.exports = router;
