require('dotenv').config();
require('express-async-errors');

const express = require('express');
const http = require('http');
const { Server: SocketServer } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const connectDB = require('./src/config/db');

// Route imports
const authRoutes     = require('./src/routes/auth');
const productRoutes  = require('./src/routes/products');
const orderRoutes    = require('./src/routes/orders');
const paymentRoutes  = require('./src/routes/payments');
const adminRoutes    = require('./src/routes/admin');
const reviewRoutes   = require('./src/routes/reviews');
const logoRoutes     = require('./src/routes/logos');
const faqRoutes      = require('./src/routes/faqs');
const mediaRoutes    = require('./src/routes/media');
const settingsRoutes = require('./src/routes/settings');
const categoryRoutes = require('./src/routes/categories');
const policyRoutes      = require('./src/routes/policies');
const newsletterRoutes  = require('./src/routes/newsletter');
const subscribeRoutes   = require('./src/routes/subscribe');
const contactRoutes     = require('./src/routes/contact');
const blogRoutes        = require('./src/routes/blogs');
const blogCategoryRoutes= require('./src/routes/blogCategories');
const blogTagRoutes     = require('./src/routes/blogTags');
const bannerRoutes      = require('./src/routes/banners');
const concernRoutes     = require('./src/routes/concerns');
const paymentSettingsRoutes = require('./src/routes/paymentSettings');
const shippingRoutes    = require('./src/routes/shipping');

const app = express();
const httpServer = http.createServer(app);

// ── Socket.io ──────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://arebianveda.com',
  'https://www.arebianveda.com',
  process.env.FRONTEND_URL || 'http://localhost:5173',
  process.env.ADMIN_URL    || 'http://localhost:5174',
  // Extra origins from env (comma-separated) — set ALLOWED_ORIGINS on Render/Vercel
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : []),
];

const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'development' ? '*' : allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Attach io to app so controllers can emit events
app.set('io', io);

io.on('connection', (socket) => {
  // Admin joins a private room to receive live-count updates
  socket.on('join:admin', () => socket.join('admin'));
  socket.on('disconnect', () => {});
});

// Helper exported so controllers can emit without importing io
app.emitAdminEvent = (event, data) => io.to('admin').emit(event, data);

// Connect to MongoDB then ensure permanent admin exists
const User = require('./src/models/User');

async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin') {
      await User.findByIdAndUpdate(existing._id, { role: 'admin' });
      console.log(`✅ Admin role enforced for ${email}`);
    }
  } else {
    await User.create({ name: 'Admin', email, password, role: 'admin', isVerified: true });
    console.log(`✅ Admin user created: ${email}`);
  }
}

connectDB().then(ensureAdmin).catch(console.error);

// Validate Shiprocket credentials at boot — logs "Missing SHIPROCKET_EMAIL" /
// "Missing SHIPROCKET_PASSWORD" if absent, so misconfiguration is caught early
// instead of surfacing later as a cryptic auth error.
require('./src/services/shiprocketService').validateConfig();

// Security middleware
app.use(helmet());

// Gzip compression — reduces JSON response size by ~70%
app.use(compression());

// Rate limiting — skip entirely in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  skip: () => process.env.NODE_ENV === 'development',
  message: 'Too many requests from this IP, please try again later.',
});

// Stricter limiter only for auth routes (brute-force protection in production)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: () => process.env.NODE_ENV === 'development',
  message: 'Too many login attempts, please try again after 15 minutes.',
});

app.use('/api', limiter);
app.use('/api/auth', authLimiter);

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (process.env.NODE_ENV === 'development') return callback(null, true);
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any .vercel.app subdomain (preview deployments)
    if (origin?.endsWith('.vercel.app')) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Static uploads
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// Body parsing — capture the raw bytes too, needed to verify the Razorpay
// webhook signature (which is computed over the exact raw request body).
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// Routes
app.use('/api/auth',       authRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/payments',   paymentRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/reviews',    reviewRoutes);
app.use('/api/coupons',    require('./src/routes/coupons'));
app.use('/api/logos',      logoRoutes);
app.use('/api/faqs',       faqRoutes);
app.use('/api/media',      mediaRoutes);
app.use('/api/settings',   settingsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/policies',    policyRoutes);
app.use('/api/newsletter',  newsletterRoutes);
app.use('/api/contact',     contactRoutes);
app.use('/api',             subscribeRoutes);
app.use('/api/blogs',       blogRoutes);
app.use('/api/blog-categories', blogCategoryRoutes);
app.use('/api/blog-tags',   blogTagRoutes);
app.use('/api/banners',     bannerRoutes);
app.use('/api/concerns',    concernRoutes);
app.use('/api/payment-settings', paymentSettingsRoutes);
app.use('/api/shipping', shippingRoutes);

// SMTP test endpoint — admin only
const { protect, adminOnly } = require('./src/middleware/auth');
app.get('/api/test-email', protect, adminOnly, async (req, res) => {
  const to = req.query.to;
  if (!to) return res.json({ error: 'Pass ?to=email@gmail.com' });
  try {
    const nodemailer = require('nodemailer');
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
    });
    await t.sendMail({
      from: `"Arebianveda" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Test Email — Arebianveda',
      html: '<p>Email is working from Render via Brevo! ✅</p>',
    });
    res.json({ success: true, message: `Sent to ${to}` });
  } catch (err) {
    res.json({ success: false, error: err.message, code: err.code });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  const mongoose = require('mongoose');
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    db: dbState[mongoose.connection.readyState] || 'unknown',
    env: {
      mongo: !!process.env.MONGO_URI,
      razorpay: !!process.env.RAZORPAY_KEY_ID,
      shiprocket: !!process.env.SHIPROCKET_EMAIL,
      jwt: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV || 'not set',
    },
  });
});

// Sitemap root (includes blogs)
app.get('/sitemap.xml', require('./src/controllers/blogController').sitemap);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: errors.join(', ') });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, message: `${field} already exists` });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID' });
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Only start the HTTP server locally (not on Vercel serverless)
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`\n Server running on http://localhost:${PORT} [${process.env.NODE_ENV}]\n`);
  });
  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n Port ${PORT} is already in use. Run: npx kill-port ${PORT}\n`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
}

module.exports = app;
