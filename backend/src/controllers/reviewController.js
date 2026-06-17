const Review = require('../models/Review');
const Order = require('../models/Order');

exports.createReview = async (req, res) => {
  const { product, rating, title, comment, name, email, city } = req.body;

  // Check if verified purchase
  let isVerifiedPurchase = false;
  if (req.user) {
    const order = await Order.findOne({
      user: req.user.id,
      'items.product': product,
      orderStatus: 'delivered',
    });
    isVerifiedPurchase = !!order;
  }

  const review = await Review.create({
    product,
    user: req.user?.id,
    rating,
    title,
    comment,
    name: req.user?.name || name,
    email: req.user?.email || email,
    city,
    isVerifiedPurchase,
    isApproved: false,
  });

  // Notify admin of new pending review
  const pendingCount = await Review.countDocuments({ isApproved: false });
  req.app.emitAdminEvent?.('reviews:update', { pendingReviews: pendingCount });

  res.status(201).json({
    success: true,
    message: 'Review submitted! It will appear after approval.',
    review,
  });
};

exports.getProductReviews = async (req, res) => {
  const { page = 1, limit = 10, rating } = req.query;
  const query = { product: req.params.productId, isApproved: true };
  if (rating) query.rating = Number(rating);

  const skip = (Number(page) - 1) * Number(limit);
  const [reviews, total] = await Promise.all([
    Review.find(query).sort({ isVerifiedPurchase: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
    Review.countDocuments(query),
  ]);

  res.json({ success: true, reviews, total, pages: Math.ceil(total / Number(limit)) });
};

exports.getPendingReviews = async (_req, res) => {
  const reviews = await Review.find({ isApproved: false })
    .sort({ createdAt: -1 })
    .populate('product', 'name');
  res.json({ success: true, reviews });
};

exports.approveReview = async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { isApproved: true },
    { new: true }
  );
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

  // Recalculate product ratings now that this review is approved
  await Review.recalculateForProduct(review.product);

  res.json({ success: true, review });
};

exports.deleteReview = async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

  const productId = review.product;
  await review.deleteOne();

  // Recalculate product ratings with this review removed
  await Review.recalculateForProduct(productId);

  res.json({ success: true, message: 'Review deleted' });
};
