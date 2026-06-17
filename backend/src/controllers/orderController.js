const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const ShippingSettings = require('../models/ShippingSettings');
const PaymentSettings = require('../models/PaymentSettings');
const { calculateShipping } = require('./shippingController');
const { applyCouponToOrder } = require('./couponController');
const { sendOrderConfirmationEmail } = require('../services/emailService');
const shiprocketService = require('../services/shiprocketService');

// Create Order (both logged in & guest)
exports.createOrder = async (req, res) => {
  const {
    items,
    shippingAddress,
    paymentMethod,
    guestInfo,
    couponCode,
    isGift,
    giftMessage,
  } = req.body;

  // Server-side payment method availability guard — reject even if frontend was bypassed
  if (!['razorpay', 'cod', 'partial_cod'].includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Invalid payment method' });
  }

  const paySettings = (await PaymentSettings.findOne().lean()) || {};
  const onlineEnabled = paySettings.onlineEnabled !== false; // default true
  const partialCodEnabled = paySettings.partialCodEnabled === true; // default false — opt-in feature

  if (paymentMethod === 'cod' || paymentMethod === 'partial_cod') {
    // treat undefined (field not yet in DB) as enabled; only block when explicitly false
    const shippingSettings = await ShippingSettings.findOne().lean();
    const codEnabledLegacy = shippingSettings ? shippingSettings.codEnabled !== false : true;
    const codEnabled = paySettings.codEnabled !== false && codEnabledLegacy;
    if (paymentMethod === 'cod' && !codEnabled) {
      return res.status(400).json({ success: false, message: 'Cash on Delivery is currently unavailable. Please pay online.' });
    }
    if (paymentMethod === 'partial_cod' && !(codEnabled && partialCodEnabled)) {
      return res.status(400).json({ success: false, message: 'Partial COD is currently unavailable. Please choose another payment method.' });
    }
  }

  if (paymentMethod === 'razorpay' && !onlineEnabled) {
    return res.status(400).json({ success: false, message: 'Online payment is currently unavailable. Please choose another payment method.' });
  }

  // Validate products & calculate totals
  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    if (!mongoose.Types.ObjectId.isValid(item.product)) {
      return res.status(400).json({ success: false, message: 'Invalid product in cart. Please refresh and try again.' });
    }
    const product = await Product.findById(item.product);
    if (!product) {
      return res.status(404).json({ success: false, message: `Product ${item.product} not found` });
    }

    let unitPrice = product.price;
    let unitsPerPurchase = 1;
    let packageFields = {};
    if (item.packageLabel) {
      const pv = product.packageVariants?.find(p => p.label === item.packageLabel);
      if (pv) {
        unitPrice = pv.price;
        unitsPerPurchase = pv.quantity;
        packageFields = { packageLabel: pv.label, packageQuantity: pv.quantity, packagePrice: pv.price };
      }
    }
    const stockNeeded = item.quantity * unitsPerPurchase;

    if (product.stock === 0) {
      return res.status(400).json({ success: false, message: 'Product is out of stock' });
    }
    if (product.stock < stockNeeded) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} units of "${product.name}" available`,
      });
    }
    orderItems.push({
      product: product._id,
      name: product.name,
      image: product.images[0]?.url,
      price: unitPrice,
      quantity: item.quantity,
      ...packageFields,
    });
    subtotal += unitPrice * item.quantity;
  }

  // Dynamic shipping from DB settings (falls back to defaults if no settings doc)
  const shippingCharge = await calculateShipping(subtotal, paymentMethod);

  // Dynamic coupon from DB (increments usedCount on success)
  const { discount, giftProduct, couponType, applicationMode } = await applyCouponToOrder(couponCode, subtotal);

  if (giftProduct) {
    orderItems.push({
      product: giftProduct._id,
      name: giftProduct.name,
      image: giftProduct.images?.[0]?.url,
      price: 0,
      quantity: 1,
      isFreeGift: true,
      originalPrice: giftProduct.price,
    });
  }

  const total = subtotal + shippingCharge - discount;

  const orderData = {
    items: orderItems,
    shippingAddress,
    paymentMethod,
    paymentGateway: paymentMethod === 'cod' ? 'cod' : 'razorpay',
    subtotal,
    shippingCharge,
    discount,
    couponCode,
    couponType:            couponType || undefined,
    couponApplicationMode: applicationMode || undefined,
    total,
    isGift,
    giftMessage,
  };

  // Partial COD: split the total into an online advance + a COD remainder
  // based on the admin-configured percentages.
  if (paymentMethod === 'partial_cod') {
    const advancePercentage = paySettings.advancePercentage ?? 20;
    const codPercentage = paySettings.codPercentage ?? (100 - advancePercentage);
    const paidOnlineAmount = Math.round(total * advancePercentage / 100);
    const remainingCodAmount = total - paidOnlineAmount;

    orderData.advancePercentage = advancePercentage;
    orderData.codPercentage = codPercentage;
    orderData.paidOnlineAmount = paidOnlineAmount;
    orderData.remainingCodAmount = remainingCodAmount;
  }

  if (req.user) {
    orderData.user = req.user.id;
  } else {
    orderData.guestInfo = guestInfo;
  }

  // COD: mark as confirmed immediately
  if (paymentMethod === 'cod') {
    orderData.paymentStatus = 'pending';
    orderData.orderStatus = 'confirmed';
  }

  const order = await Order.create(orderData);

  // Auto-push the order to Shiprocket. Never throws — on failure the order
  // stays on the website with shippingStatus = 'not_created' + an error
  // message, and the admin can retry from the Shiprocket panel.
  try {
    await shiprocketService.syncOrder(order, { email: req.user?.email || guestInfo?.email });
  } catch (shiprocketErr) {
    console.error('[Shiprocket] Auto-sync failed:', shiprocketErr.message);
  }

  // Send confirmation email only for COD (online payment sends after Razorpay verify/webhook)
  if (paymentMethod === 'cod') {
    try {
      // Atomic claim — guarantees the email is sent at most once even under retries
      const claimed = await Order.findOneAndUpdate(
        { _id: order._id, confirmationEmailSent: false },
        { confirmationEmailSent: true }
      );
      const emailTo = req.user?.email || guestInfo?.email;
      if (claimed && emailTo) await sendOrderConfirmationEmail(order, emailTo);
    } catch (emailErr) {
      console.error('[Email] Failed to send confirmation:', emailErr.message);
    }
  }

  // Decrement stock (free gifts reduce stock but don't count as "sold")
  for (const item of orderItems) {
    const units = item.quantity * (item.packageQuantity || 1);
    await Product.findByIdAndUpdate(item.product, {
      $inc: item.isFreeGift
        ? { stock: -units }
        : { stock: -units, sold: units },
    });
  }

  // Notify admin dashboard via Socket.io
  const [totalOrders, pendingOrders, unviewedCount] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ orderStatus: { $in: ['placed', 'confirmed'] } }),
    Order.countDocuments({ viewedByAdmin: false }),
  ]);
  req.app.emitAdminEvent?.('orders:update', { totalOrders, pendingOrders, unviewedCount, newOrder: { orderId: order.orderId, total: order.total } });

  res.status(201).json({ success: true, order });
};

exports.getMyOrders = async (req, res) => {
  const email = req.user.email?.toLowerCase().trim();
  const query = email && !email.endsWith('@arebianvedase.internal')
    ? { $or: [{ user: req.user.id }, { 'guestInfo.email': email }] }
    : { user: req.user.id };

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .populate('items.product', 'name images slug');
  res.json({ success: true, orders });
};

exports.getOrder = async (req, res) => {
  let query;
  if (req.user) {
    const email = req.user.email?.toLowerCase().trim();
    const byEmail = email && !email.endsWith('@arebianvedase.internal')
      ? { 'guestInfo.email': email }
      : null;
    query = byEmail
      ? { _id: req.params.id, $or: [{ user: req.user.id }, byEmail] }
      : { _id: req.params.id, user: req.user.id };
  } else {
    query = { orderId: req.params.id };
  }

  const order = await Order.findOne(query).populate('items.product', 'name images slug');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, order });
};

// Admin: get all orders (with search across orderId, name, phone, email)
exports.getAllOrders = async (req, res) => {
  const { status, page = 1, limit = 20, search } = req.query;
  const query = {};
  if (status) query.orderStatus = status;
  if (search) {
    const re = { $regex: search, $options: 'i' };
    query.$or = [
      { orderId: re },
      { 'shippingAddress.name': re },
      { 'shippingAddress.phone': re },
      { 'guestInfo.email': re },
      { 'guestInfo.name': re },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'name email'),
    Order.countDocuments(query),
  ]);

  res.json({ success: true, orders, total, pages: Math.ceil(total / Number(limit)) });
};

// Admin: get single order with full details — marks it as viewed
exports.getAdminOrder = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('items.product', 'name slug images');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  if (!order.viewedByAdmin) {
    order.viewedByAdmin = true;
    await order.save();
    const unviewedCount = await Order.countDocuments({ viewedByAdmin: false });
    req.app.emitAdminEvent?.('orders:unviewed', { unviewedCount });
  }

  res.json({ success: true, order });
};

exports.getUnviewedCount = async (req, res) => {
  const unviewedCount = await Order.countDocuments({ viewedByAdmin: false });
  res.json({ success: true, unviewedCount });
};

exports.updateOrderStatus = async (req, res) => {
  const { orderStatus, trackingNumber, trackingUrl, note } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  order.orderStatus = orderStatus;
  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (trackingUrl) order.trackingUrl = trackingUrl;
  if (orderStatus === 'delivered') {
    order.deliveredAt = new Date();
    // COD payment is collected on delivery — mark it paid so it counts as revenue
    if (order.paymentMethod === 'cod' && order.paymentStatus === 'pending') {
      order.paymentStatus = 'paid';
    }
    // Partial COD: the remaining COD amount is collected on delivery —
    // the advance was already captured via Razorpay (paymentStatus === 'partially_paid')
    if (order.paymentMethod === 'partial_cod' && order.paymentStatus === 'partially_paid') {
      order.paymentStatus = 'fully_paid';
    }
  }
  if (orderStatus === 'cancelled') {
    order.cancelledAt = new Date();
    order.cancelReason = note;
    // Restore stock
    for (const item of order.items) {
      const units = item.quantity * (item.packageQuantity || 1);
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: units, sold: -units },
      });
    }
    // Best-effort: also cancel the shipment in Shiprocket
    if (order.shiprocketOrderId) {
      await shiprocketService.cancelShiprocketOrder(order);
      order.shippingStatus = 'cancelled';
    }
  }

  // Push note-aware history entry; pre-save hook skips auto-push when history is modified
  order.statusHistory.push({ status: orderStatus, note: note || undefined, timestamp: new Date() });

  await order.save();
  res.json({ success: true, order });
};

// Admin: manually correct/advance a payment status (e.g. mark Partial COD's
// remaining cash as collected without changing the order/delivery status).
exports.updatePaymentStatus = async (req, res) => {
  const { paymentStatus } = req.body;
  const allowed = ['pending', 'paid', 'failed', 'refunded', 'partially_paid', 'fully_paid'];
  if (!allowed.includes(paymentStatus)) {
    return res.status(400).json({ success: false, message: 'Invalid payment status' });
  }

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  order.paymentStatus = paymentStatus;
  await order.save();
  res.json({ success: true, order });
};

exports.deleteOrder = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  // Restore stock only if order was active (not already cancelled)
  if (order.orderStatus !== 'cancelled') {
    for (const item of order.items) {
      const units = item.quantity * (item.packageQuantity || 1);
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: units, sold: -units },
      });
    }
  }

  await order.deleteOne();
  res.json({ success: true, message: 'Order deleted' });
};

exports.getDashboardStats = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const Review = require('../models/Review');

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    totalOrders,
    todayOrders,
    totalRevenue,
    todayRevenue,
    pendingOrders,
    recentOrders,
    totalUsers,
    pendingReviews,
    monthlyRevenue,
    topProducts,
    categorySales,
    shippingAgg,
  ] = await Promise.all([
    Order.countDocuments({ paymentStatus: { $ne: 'failed' } }),
    Order.countDocuments({ createdAt: { $gte: today } }),
    // 'fully_paid' = Partial COD orders where both the advance and the COD
    // remainder have been collected — counts as fully realized revenue.
    Order.aggregate([
      { $match: { paymentStatus: { $in: ['paid', 'fully_paid'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: today }, paymentStatus: { $in: ['paid', 'fully_paid'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    // Count all active (non-terminal) statuses
    Order.countDocuments({ orderStatus: { $in: ['placed', 'confirmed', 'processing', 'shipped'] } }),
    Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email'),
    User.countDocuments({ role: 'user' }),
    Review.countDocuments({ isApproved: false }),

    // Monthly revenue chart (last 6 months)
    Order.aggregate([
      { $match: { paymentStatus: { $in: ['paid', 'fully_paid'] }, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),

    // Top 5 products by units sold
    Product.find({ isActive: true, sold: { $gt: 0 } })
      .sort({ sold: -1 })
      .limit(5)
      .select('name categories sold price images'),

    // Sales by category (from product sold counts)
    Product.aggregate([
      { $match: { isActive: true, sold: { $gt: 0 } } },
      { $unwind: { path: '$categories', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$categories', sold: { $sum: '$sold' }, revenue: { $sum: { $multiply: ['$price', '$sold'] } } } },
      { $sort: { sold: -1 } },
    ]),

    // Shiprocket shipping status breakdown
    Order.aggregate([
      { $group: { _id: '$shippingStatus', count: { $sum: 1 } } },
    ]),
  ]);

  const shippingCounts = Object.fromEntries(shippingAgg.map(s => [s._id || 'not_created', s.count]));
  const shippingStats = {
    pendingShipment: (shippingCounts.not_created || 0) + (shippingCounts.created || 0),
    readyToShip: (shippingCounts.ready_to_ship || 0) + (shippingCounts.pickup_scheduled || 0),
    inTransit: (shippingCounts.shipped || 0) + (shippingCounts.in_transit || 0) + (shippingCounts.out_for_delivery || 0),
    delivered: shippingCounts.delivered || 0,
    cancelled: (shippingCounts.cancelled || 0) + (shippingCounts.rto || 0),
  };

  res.json({
    success: true,
    stats: {
      totalOrders,
      todayOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      todayRevenue: todayRevenue[0]?.total || 0,
      pendingOrders,
      totalUsers,
      pendingReviews,
    },
    recentOrders,
    monthlyRevenue,
    topProducts,
    categorySales,
    shippingStats,
  });
};
