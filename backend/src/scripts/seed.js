require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
const connectDB = require('../config/db');

const products = [
  {
    name: 'Arebianveda Shilajit Resin',
    tagline: 'Pure Himalayan Shilajit — Nature\'s Most Powerful Rejuvenator',
    description: `Sourced from the pristine Himalayan rocks at altitudes above 16,000 feet, Arebianveda Shilajit Resin is a pure, unprocessed form of the legendary Rasayana herb. Rich in Fulvic Acid, Humic Acid, and 85+ trace minerals, it restores vitality, boosts stamina, and supports overall health the ancient Ayurvedic way.`,
    categories: ['shilajit'],
    concerns: ['Energy & Stamina'],
    keyHerbs: ['Shilajit', 'Fulvic Acid', 'Humic Acid'],
    forms: ['resin'],
    ayurvedicType: 'Rasayana',
    dosage: 'Take a pea-sized amount (300–500mg) with warm milk or water twice daily',
    suitableFor: ['Men', 'Women'],
    certifications: ['FSSAI', 'GMP', 'ISO', 'Lab Tested'],
    price: 750,
    comparePrice: 1099,
    variants: [
      { label: '10g', price: 750, comparePrice: 1099, stock: 50 },
      { label: '20g', price: 1299, comparePrice: 1899, stock: 40 },
      { label: '30g', price: 1799, comparePrice: 2499, stock: 30 },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1611241893603-3c359704e0ee?w=800', alt: 'Shilajit Resin' },
    ],
    benefits: [
      { title: 'Boosts Energy & Stamina', description: 'Fulvic acid supercharges your mitochondria — the energy powerhouses of your cells.', icon: '⚡' },
      { title: 'Enhances Male Vitality', description: 'Clinically shown to support testosterone levels and reproductive health in men.', icon: '💪' },
      { title: '85+ Trace Minerals', description: 'Remineralizes your body with rare minerals that are absent in modern diets.', icon: '🌿' },
      { title: 'Anti-Aging Rasayana', description: 'Ancient Ayurveda classifies Shilajit as the #1 Rasayana for longevity and rejuvenation.', icon: '✨' },
    ],
    ingredients: ['Pure Himalayan Shilajit', 'Fulvic Acid (>60%)', 'Humic Acid', '85+ trace minerals'],
    howToUse: 'Dissolve a pea-sized portion in warm milk or water. Consume on empty stomach in morning and before bed. Do not mix with raw/cold water.',
    stock: 50,
    isFeatured: true,
    isBestseller: true,
    tags: ['shilajit', 'energy', 'stamina', 'rasayana', 'himalayan'],
    seoTitle: 'Pure Himalayan Shilajit Resin - Energy & Stamina | Arebianveda',
    seoDescription: 'Buy authentic Himalayan Shilajit Resin by Arebianveda. Rich in Fulvic Acid & 85+ minerals. FSSAI & GMP certified. ₹750 onwards.',
  },
  {
    name: 'Arebianveda Black Tower Shilajit Capsules',
    tagline: 'All Power of Shilajit — Now in Convenient Capsule Form',
    description: `Arebianveda Black Tower capsules contain 500mg of pure, standardized Himalayan Shilajit extract per capsule. Each capsule is standardized to >60% Fulvic Acid for consistent potency. Perfect for those who prefer the convenience of capsules over raw resin. Third-party lab tested for purity and heavy metals.`,
    categories: ['shilajit'],
    concerns: ['Energy & Stamina'],
    keyHerbs: ['Shilajit Extract', 'Fulvic Acid'],
    forms: ['capsule'],
    ayurvedicType: 'Rasayana',
    dosage: 'Take 1 capsule twice daily with warm milk or water after meals',
    suitableFor: ['Men', 'Women'],
    certifications: ['FSSAI', 'GMP', 'ISO', 'Lab Tested', 'Vegan'],
    price: 750,
    comparePrice: 1099,
    variants: [
      { label: '30 Capsules', price: 750, comparePrice: 1099, stock: 60 },
      { label: '60 Capsules', price: 1399, comparePrice: 1999, stock: 45 },
      { label: '90 Capsules', price: 1999, comparePrice: 2799, stock: 35 },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800', alt: 'Shilajit Capsules' },
    ],
    benefits: [
      { title: 'Standardized 500mg / Capsule', description: 'Each capsule delivers a precise, clinically-studied dose of Shilajit extract.', icon: '💊' },
      { title: 'Gym & Athletic Performance', description: 'Proven to reduce exercise-induced muscle damage and accelerate recovery.', icon: '🏋️' },
      { title: 'Brain & Cognitive Health', description: 'Fulvic acid crosses the blood-brain barrier — enhancing memory and mental clarity.', icon: '🧠' },
      { title: 'No Heavy Metals', description: 'Third-party lab tested for lead, mercury, arsenic and cadmium. Safe for daily use.', icon: '🔬' },
    ],
    ingredients: ['Shilajit Extract (500mg)', 'Fulvic Acid (>60%)', 'HPMC Capsule shell (Vegan)'],
    howToUse: 'Take 1 capsule with warm milk or water after breakfast and 1 after dinner. Consistent daily use for 90 days gives best results.',
    stock: 60,
    isFeatured: true,
    isBestseller: true,
    tags: ['shilajit', 'capsules', 'gym', 'energy', 'black tower'],
    seoTitle: 'Shilajit Capsules 500mg - Black Tower | Arebianveda',
    seoDescription: 'Arebianveda Black Tower Shilajit Capsules — 500mg per capsule, >60% Fulvic Acid, FSSAI & GMP certified. Best for gym & stamina.',
  },
  {
    name: 'Arebianveda Shilajit Lump',
    tagline: 'Raw, Unprocessed Shilajit — Closest to Nature',
    description: `The most raw and natural form of Shilajit — collected directly from Himalayan rock faces, sun-dried, and minimally processed to preserve all natural compounds intact. Shilajit Lump has the highest bioavailability and is preferred by Ayurvedic practitioners for its unmatched purity and potency.`,
    categories: ['shilajit'],
    concerns: ['Energy & Stamina'],
    keyHerbs: ['Raw Shilajit', 'Fulvic Acid', 'Trace Minerals'],
    forms: ['lump'],
    ayurvedicType: 'Rasayana',
    dosage: 'Break a rice-grain sized piece, dissolve in warm milk or ghee, consume twice daily',
    suitableFor: ['Men', 'Women', 'Elderly'],
    certifications: ['FSSAI', 'GMP', 'Lab Tested'],
    price: 900,
    comparePrice: 1400,
    variants: [
      { label: '10g', price: 900, comparePrice: 1400, stock: 40 },
      { label: '20g', price: 1699, comparePrice: 2499, stock: 30 },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1610395219791-21b0353e43cb?w=800', alt: 'Shilajit Lump' },
    ],
    benefits: [
      { title: 'Highest Bioavailability', description: 'Raw lump form absorbs fastest — no processing means all minerals and compounds are 100% intact.', icon: '🏔️' },
      { title: 'Authentic Ayurvedic Form', description: 'This is exactly how Shilajit was used in ancient Ayurvedic texts — unadulterated and raw.', icon: '📜' },
      { title: 'Immune System Booster', description: 'The diverse mineral complex and humic compounds significantly strengthen your immune response.', icon: '🛡️' },
      { title: 'Natural Detoxification', description: 'Fulvic acid binds to heavy metals and toxins in your body, aiding gentle daily detox.', icon: '🌱' },
    ],
    ingredients: ['Raw Himalayan Shilajit (100% pure)', 'Natural Fulvic & Humic Acid complex'],
    howToUse: 'Take a rice-grain-sized piece. Dissolve completely in warm milk, ghee, or water. Consume on empty stomach for best absorption. Do not heat above 40°C.',
    stock: 40,
    isFeatured: true,
    isBestseller: false,
    tags: ['shilajit', 'raw', 'lump', 'pure', 'himalayan', 'authentic'],
    seoTitle: 'Raw Himalayan Shilajit Lump — Pure & Unprocessed | Arebianveda',
    seoDescription: 'Buy raw, unprocessed Himalayan Shilajit Lump by Arebianveda. Highest bioavailability, lab-tested purity. FSSAI certified.',
  },
  {
    name: 'Arebianveda D99 Kwath',
    tagline: 'Ancient 9-Herb Formula for Blood Sugar Balance',
    description: `D99 Kwath is an authentic Ayurvedic decoction (Kwath) formulated with 9 potent herbs traditionally used for managing blood sugar levels naturally. Based on classical Ayurvedic texts, this formula works on the root cause — improving insulin sensitivity, reducing sugar absorption, and rejuvenating the pancreas.`,
    categories: ['wellness'],
    concerns: ['Sugar Management'],
    keyHerbs: ['Karela', 'Jamun Seed', 'Gurmar', 'Vijaysar', 'Methi', 'Neem', 'Giloy', 'Tulsi', 'Amla'],
    forms: ['liquid'],
    ayurvedicType: 'Kwath',
    dosage: 'Take 30ml with 30ml water on empty stomach, twice daily before meals',
    suitableFor: ['Men', 'Women', 'Elderly'],
    certifications: ['FSSAI', 'GMP', 'Organic', 'No Sugar Added'],
    price: 699,
    comparePrice: 1499,
    variants: [
      { label: '500ml', price: 699, comparePrice: 1499, stock: 55 },
      { label: '1 Litre', price: 1299, comparePrice: 2499, stock: 40 },
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', alt: 'D99 Kwath' },
    ],
    benefits: [
      { title: 'Supports Blood Sugar Balance', description: 'Gurmar (literally "sugar destroyer") and Karela work synergistically to manage post-meal blood sugar spikes.', icon: '🩸' },
      { title: 'Pancreas Rejuvenation', description: 'Vijaysar bark is traditionally used to rejuvenate beta cells and improve insulin function naturally.', icon: '🌿' },
      { title: 'Zero Synthetic Additives', description: 'Pure herbal extract — no artificial sweeteners, no preservatives, no synthetic chemicals.', icon: '✅' },
      { title: 'Safe for Long-Term Use', description: 'Classical Ayurvedic formulation safe for daily consumption with zero known side effects.', icon: '🕒' },
    ],
    ingredients: ['Karela (Bitter Melon)', 'Jamun Seed', 'Gurmar Leaves', 'Vijaysar Bark', 'Methi (Fenugreek)', 'Neem Leaves', 'Giloy Stem', 'Tulsi', 'Amla'],
    howToUse: 'Shake well before use. Dilute 30ml in 30ml water. Consume on empty stomach 30 minutes before breakfast and dinner. Store in cool, dry place.',
    stock: 55,
    isFeatured: true,
    isBestseller: true,
    tags: ['kwath', 'blood sugar', 'diabetes', 'karela', 'ayurvedic', 'd99'],
    seoTitle: 'D99 Kwath — 9-Herb Blood Sugar Formula | Arebianveda',
    seoDescription: 'Arebianveda D99 Kwath — Ayurvedic herbal decoction for blood sugar balance. 9 potent herbs, FSSAI certified, no sugar added.',
  },
];

async function seed() {
  try {
    await connectDB();

    await Product.collection.drop().catch(() => {});

    const created = [];
    for (const productData of products) {
      const product = await Product.create(productData);
      created.push(product);
    }
    console.log(`✅ Seeded ${created.length} Arebianveda products`);

    const ids = created.map(p => p._id);
    await Promise.all([
      Product.findByIdAndUpdate(ids[0], { upsells: [ids[1], ids[2]] }),
      Product.findByIdAndUpdate(ids[1], { upsells: [ids[0], ids[2]] }),
      Product.findByIdAndUpdate(ids[2], { upsells: [ids[0], ids[1]] }),
      Product.findByIdAndUpdate(ids[3], { upsells: [ids[0], ids[1]] }),
    ]);
    console.log('✅ Upsells linked');

    await User.deleteMany({ role: 'admin' });
    await User.create({
      name: 'Arebianveda Admin',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
    });
    console.log('✅ Admin user created');

    console.log('\n🎉 Arebianveda database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
