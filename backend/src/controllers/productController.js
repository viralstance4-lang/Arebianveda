const Product = require('../models/Product');
const Review = require('../models/Review');

exports.getAllProducts = async (req, res) => {
  const { category, sort, featured, bestseller, search, page = 1, limit = 12 } = req.query;

  const query = { isActive: true };
  if (category) query.categories = category;
  if (featured === 'true') query.isFeatured = true;
  if (bestseller === 'true') query.isBestseller = true;
  if (search) {
    // Case-insensitive partial match on name/description.
    // (MongoDB $text only matches whole stemmed words, so "soul" wouldn't match "Soulmate".)
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: re }, { description: re }];
  }

  const sortMap = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    newest: { createdAt: -1 },
    popular: { sold: -1 },
    rating: { 'ratings.average': -1 },
  };

  const sortOption = sortMap[sort] || { isFeatured: -1, createdAt: -1 };

  const skip = (Number(page) - 1) * Number(limit);
  const [products, total] = await Promise.all([
    Product.find(query).sort(sortOption).skip(skip).limit(Number(limit)).select('-costPrice').populate('categoryIds', 'name slug emoji color'),
    Product.countDocuments(query),
  ]);

  res.json({
    success: true,
    products,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit),
    },
  });
};

exports.getProduct = async (req, res) => {
  const { slug } = req.params;
  const mongoose = require('mongoose');

  // Build query: always match by slug; only add _id match if it looks like a valid ObjectId
  const orConditions = [{ slug }];
  if (mongoose.Types.ObjectId.isValid(slug)) orConditions.push({ _id: slug });

  const product = await Product.findOne({
    $or: orConditions,
    isActive: true,
  }).populate('upsells', 'name slug price comparePrice images categories tagline ratings');

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  // Fetch reviews + live counts in parallel — overrides any stale cached value
  const [reviews, approvedCount, ratingStats] = await Promise.all([
    Review.find({ product: product._id, isApproved: true })
      .sort({ isVerifiedPurchase: -1, createdAt: -1 })
      .limit(10),
    Review.countDocuments({ product: product._id, isApproved: true }),
    Review.aggregate([
      { $match: { product: product._id, isApproved: true } },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]),
  ]);

  const liveAverage = ratingStats[0]
    ? Math.round(ratingStats[0].avg * 10) / 10
    : 0;

  // Build response with guaranteed-fresh ratings
  const productData = product.toObject();
  productData.ratings = { average: liveAverage, count: approvedCount };

  // Sync DB if the cached value drifted (fire-and-forget, non-blocking)
  if (
    product.ratings.count  !== approvedCount ||
    product.ratings.average !== liveAverage
  ) {
    Product.findByIdAndUpdate(product._id, {
      'ratings.average': liveAverage,
      'ratings.count':   approvedCount,
    }).exec().catch(() => {});
  }

  res.json({ success: true, product: productData, reviews });
};

exports.getFeaturedProducts = async (_req, res) => {
  const products = await Product.find({ isFeatured: true, isActive: true })
    .select('-costPrice')
    .limit(8);
  res.json({ success: true, products });
};

exports.createProduct = async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, product });
};

exports.updateProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, product });
};

exports.deleteProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, message: 'Product deactivated' });
};

exports.uploadProductImages = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No images uploaded' });
  }

  const backendOrigin = `${req.protocol}://${req.get('host')}`;

  const images = req.files.map(file => {
    // multer-storage-cloudinary v4: file.path = secure_url, file.filename = public_id
    // multer disk storage:          file.path = absolute fs path, file.filename = basename
    const isCloudinary = file.path?.startsWith('http');
    return {
      url:       isCloudinary ? file.path : `${backendOrigin}/uploads/products/${file.filename}`,
      public_id: isCloudinary ? file.filename : null,
    };
  });

  res.json({ success: true, images });
};

exports.getRelatedProducts = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  const related = await Product.find({
    categories: { $in: product.categories },
    _id: { $ne: product._id },
    isActive: true,
  })
    .limit(4)
    .select('-costPrice');

  res.json({ success: true, products: related });
};
