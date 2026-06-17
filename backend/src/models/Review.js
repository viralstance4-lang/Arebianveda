const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  name: { type: String, required: true },
  email: String,
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: String,
  comment: { type: String, required: true },
  images: [String],
  isVerifiedPurchase: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  helpfulVotes: { type: Number, default: 0 },
  city: String, // social proof: "Priya from Mumbai"
}, { timestamps: true });

// ── Shared helper: recalculate ratings for a product from approved reviews ───
reviewSchema.statics.recalculateForProduct = async function (productId) {
  const Product = mongoose.model('Product');
  const stats = await this.aggregate([
    { $match: { product: productId, isApproved: true } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      'ratings.average': Math.round(stats[0].avgRating * 10) / 10,
      'ratings.count':   stats[0].count,
    });
  } else {
    // No approved reviews left — reset to zero
    await Product.findByIdAndUpdate(productId, {
      'ratings.average': 0,
      'ratings.count':   0,
    });
  }
};

// Update product rating after review save (new review submitted)
reviewSchema.post('save', async function () {
  await mongoose.model('Review').recalculateForProduct(this.product);
});

module.exports = mongoose.model('Review', reviewSchema);
