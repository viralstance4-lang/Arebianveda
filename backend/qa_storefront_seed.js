require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./src/models/Category');
const Product = require('./src/models/Product');
const Coupon = require('./src/models/Coupon');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to', process.env.MONGO_URI);

  const cat1 = await Category.create({
    name: 'QA Shilajit & Resins',
    description: 'Raw and resin forms of Himalayan Shilajit',
    emoji: '🌿', color: '#D4AF37', status: 'published', order: 1,
  });
  const cat2 = await Category.create({
    name: 'QA Capsules & Tablets',
    description: 'Convenient capsule formats',
    emoji: '💊', color: '#1A7A3C', status: 'published', order: 2,
  });

  const p1 = await Product.create({
    name: 'QA Arebianveda Shilajit Resin',
    tagline: "Pure Himalayan — Nature's Rejuvenator",
    description: 'Lab-tested Himalayan Shilajit resin, rich in fulvic acid and 85+ trace minerals.',
    categories: [cat1.name],
    categoryIds: [cat1._id],
    concerns: ['Energy & Stamina'],
    forms: ['resin'],
    ayurvedicType: 'Rasayana',
    certifications: ['FSSAI', 'GMP', 'Lab Tested'],
    keyHerbs: ['Himalayan Shilajit', 'Fulvic Acid'],
    variants: [
      { label: '10g', price: 750, comparePrice: 1099, stock: 50 },
      { label: '20g', price: 1299, comparePrice: 1899, stock: 40 },
    ],
    price: 750,
    comparePrice: 1099,
    images: [{ url: 'https://images.unsplash.com/photo-1611241893603-3c359704e0ee?w=600', alt: 'Shilajit Resin' }],
    benefits: [{ title: 'Boosts Energy', description: 'Supports stamina and vitality', icon: '⚡' }],
    stock: 50,
    isFeatured: true,
    isActive: true,
    isBestseller: true,
    ratings: { average: 4.8, count: 1243 },
  });

  const p2 = await Product.create({
    name: 'QA Black Tower Shilajit Capsules',
    tagline: '500mg Pure Extract Per Capsule',
    description: 'Standardized Shilajit extract capsules, third-party lab tested.',
    categories: [cat2.name],
    categoryIds: [cat2._id],
    concerns: ['Gym & Fitness'],
    forms: ['capsule'],
    ayurvedicType: 'Rasayana',
    certifications: ['FSSAI', 'GMP', 'Vegan'],
    keyHerbs: ['Shilajit Extract'],
    variants: [
      { label: '30 Capsules', price: 750, comparePrice: 1099, stock: 60 },
    ],
    price: 750,
    comparePrice: 1099,
    images: [{ url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600', alt: 'Shilajit Capsules' }],
    benefits: [{ title: 'Gym Performance', description: 'Reduces exercise-induced fatigue', icon: '🏋️' }],
    stock: 60,
    isFeatured: true,
    isActive: true,
    isBestseller: true,
    ratings: { average: 4.7, count: 986 },
  });

  const p3 = await Product.create({
    name: 'QA Out Of Stock Immunity Tonic',
    tagline: 'Currently unavailable — Out of Stock test product',
    description: 'Used to verify out-of-stock UI behaviour on the storefront.',
    categories: [cat1.name],
    categoryIds: [cat1._id],
    concerns: ['Immunity'],
    forms: ['liquid'],
    certifications: ['FSSAI'],
    variants: [
      { label: '500ml', price: 499, comparePrice: 699, stock: 0 },
    ],
    price: 499,
    comparePrice: 699,
    images: [{ url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600', alt: 'Immunity Tonic' }],
    stock: 0,
    isFeatured: false,
    isActive: true,
    isBestseller: false,
    ratings: { average: 4.2, count: 12 },
  });

  const p4 = await Product.create({
    name: 'QA Free Gift Sachet',
    tagline: 'Sample-size Shilajit sachet — used as free-gift coupon reward',
    description: 'Small free-gift sachet given with qualifying orders.',
    categories: [cat2.name],
    categoryIds: [cat2._id],
    concerns: ['Energy & Stamina'],
    forms: ['powder'],
    certifications: ['FSSAI'],
    variants: [{ label: '5g Sachet', price: 99, comparePrice: 149, stock: 100 }],
    price: 99,
    comparePrice: 149,
    images: [{ url: 'https://images.unsplash.com/photo-1610395219791-21b0353e43cb?w=600', alt: 'Free Gift Sachet' }],
    stock: 100,
    isFeatured: false,
    isActive: true,
    isBestseller: false,
    ratings: { average: 4.5, count: 30 },
  });

  await Coupon.create({
    code: 'QASAVE10',
    description: '10% off, manual entry',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscountAmount: 200,
    applicationMode: 'manual',
    minOrderValue: 0,
    isActive: true,
  });

  await Coupon.create({
    code: 'QAAUTO50',
    description: 'Auto ₹50 off orders over ₹500',
    discountType: 'fixed',
    discountValue: 50,
    applicationMode: 'auto',
    minOrderValue: 500,
    isActive: true,
  });

  await Coupon.create({
    code: 'QAFREEGIFT',
    description: 'Auto free gift sachet on orders over ₹1000',
    discountType: 'free_gift',
    discountValue: 0,
    giftProduct: p4._id,
    applicationMode: 'auto',
    minOrderValue: 1000,
    isActive: true,
  });

  console.log('Seed complete');
  console.log('Category 1:', cat1._id.toString(), cat1.slug);
  console.log('Category 2:', cat2._id.toString(), cat2.slug);
  console.log('Product 1 (in stock, resin):', p1._id.toString(), p1.slug);
  console.log('Product 2 (in stock, capsules):', p2._id.toString(), p2.slug);
  console.log('Product 3 (OUT OF STOCK):', p3._id.toString(), p3.slug);
  console.log('Product 4 (free gift):', p4._id.toString(), p4.slug);

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
