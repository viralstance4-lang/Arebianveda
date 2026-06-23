const crypto = require('crypto');
const User = require('../models/User');
const Order = require('../models/Order');
const PhoneOTP = require('../models/PhoneOTP');
const jwt = require('jsonwebtoken');

// Link any unlinked guest orders with this email to the user account
async function claimGuestOrders(userId, email) {
  if (!email || email.endsWith('@arebianvedase.internal')) return;
  await Order.updateMany(
    {
      $or: [{ user: null }, { user: { $exists: false } }],
      'guestInfo.email': email.toLowerCase().trim(),
    },
    { $set: { user: userId } }
  );
}

const sendToken = (user, statusCode, res) => {
  const token = user.getJwtToken();
  user.password = undefined;
  res.status(statusCode).json({ success: true, token, user });
};

exports.register = async (req, res) => {
  const { name, email, phone, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  const user = await User.create({ name, email, phone, password });
  await claimGuestOrders(user._id, user.email);
  sendToken(user, 201, res);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  await claimGuestOrders(user._id, user.email);
  sendToken(user, 200, res);
};

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, user });
};

exports.updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, phone },
    { new: true, runValidators: true }
  );
  res.json({ success: true, user });
};

exports.addAddress = async (req, res) => {
  const user = await User.findById(req.user.id);
  const newAddress = req.body;

  if (newAddress.isDefault || user.addresses.length === 0) {
    user.addresses.forEach(addr => (addr.isDefault = false));
    newAddress.isDefault = true;
  }

  user.addresses.push(newAddress);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
};

exports.updateAddress = async (req, res) => {
  const user = await User.findById(req.user.id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

  const { name, phone, line1, line2, city, state, pincode, isDefault } = req.body;
  ['name', 'phone', 'line1', 'line2', 'city', 'state', 'pincode'].forEach(field => {
    if (req.body[field] !== undefined) address[field] = req.body[field];
  });

  if (isDefault) {
    user.addresses.forEach(addr => (addr.isDefault = false));
    address.isDefault = true;
  } else if (isDefault === false) {
    address.isDefault = false;
  }

  await user.save();
  res.json({ success: true, addresses: user.addresses });
};

exports.deleteAddress = async (req, res) => {
  const user = await User.findById(req.user.id);
  const address = user.addresses.id(req.params.addressId);
  if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

  const wasDefault = address.isDefault;
  address.deleteOne();

  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  res.json({ success: true, addresses: user.addresses });
};

exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    return res.status(400).json({ success: false, message: 'Current password incorrect' });
  }

  user.password = newPassword;
  await user.save();
  sendToken(user, 200, res);
};

exports.toggleWishlist = async (req, res) => {
  const user = await User.findById(req.user.id);
  const productId = req.params.productId;
  const idx = user.wishlist.indexOf(productId);

  if (idx > -1) {
    user.wishlist.splice(idx, 1);
  } else {
    user.wishlist.push(productId);
  }

  await user.save();
  res.json({ success: true, wishlist: user.wishlist });
};

exports.getWishlist = async (req, res) => {
  const user = await User.findById(req.user.id).populate('wishlist');
  res.json({ success: true, wishlist: user.wishlist });
};

// ─── OTP Login ────────────────────────────────────────────────────────────────

// Send OTP via SMS using Fast2SMS (add FAST2SMS_API_KEY to .env)
async function sendOtpSms(phone, otp) {
  if (process.env.FAST2SMS_API_KEY) {
    const https = require('https');
    const params = new URLSearchParams({
      route: 'otp',
      variables_values: otp,
      numbers: phone,
    });
    await new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.fast2sms.com',
        path: `/dev/bulkV2?${params.toString()}`,
        method: 'GET',
        headers: { authorization: process.env.FAST2SMS_API_KEY },
      };
      const r = https.request(options, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try { const j = JSON.parse(data); j.return ? resolve() : reject(new Error(j.message)); }
          catch { resolve(); }
        });
      });
      r.on('error', reject);
      r.end();
    });
    console.log(`[OTP] SMS sent to +91${phone} via Fast2SMS`);
    return { channel: 'sms' };
  }

  // No SMS provider — console only
  console.log(`\n[OTP] *** DEV — OTP for +91${phone}: ${otp} ***\n`);
  return { channel: 'none' };
}

// Send OTP via email using Resend
async function sendOtpEmail(email, otp, phone) {
  if (!process.env.RESEND_API_KEY) return false;

  const { sendResendEmail } = require('../services/resendMailer');
  await sendResendEmail({
    to: email,
    fromName: process.env.FROM_NAME || 'Arebianveda',
    fromEmail: process.env.FROM_EMAIL,
    subject: `Your OTP is ${otp} — Arebianveda`,
    html: `
      <div style="background:#FFFDF5;padding:40px 20px;font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
        <h2 style="color:#B8860B;margin:0 0 8px;font-size:22px;">Your OTP Code</h2>
        <p style="color:#92400e;font-size:14px;margin:0 0 24px;">
          Use this code to sign in to Arebianveda with mobile <strong style="color:#451a03;">+91 ${phone}</strong>
        </p>
        <div style="background:#FFF0C8;border:1px solid #D4A017;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
          <span style="font-size:38px;font-weight:bold;letter-spacing:10px;color:#B8860B;">${otp}</span>
        </div>
        <p style="color:#b45309;font-size:12px;margin:0;">
          Valid for <strong>10 minutes</strong>. Do not share this code with anyone.
        </p>
      </div>
    `,
  });
  console.log(`[OTP] Email sent to ${email} via Resend`);
  return true;
}

// POST /api/auth/otp/send
exports.sendOtp = async (req, res) => {
  const { phone } = req.body;

  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Enter a valid 10-digit Indian mobile number' });
  }

  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();

  // Upsert OTP record (TTL index auto-expires after 10 min)
  await PhoneOTP.findOneAndUpdate(
    { phone },
    { otp, attempts: 0, createdAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Try SMS first
  const { channel } = await sendOtpSms(phone, otp);

  // If no SMS provider, try email fallback (user must have this phone on their account)
  let emailSent = false;
  let maskedEmail = '';
  if (channel === 'none') {
    const existingUser = await User.findOne({ phone });
    if (existingUser?.email && !existingUser.email.endsWith('@arebianvedase.internal')) {
      emailSent = await sendOtpEmail(existingUser.email, otp, phone);
      if (emailSent) {
        // Mask email for display: su***@gmail.com
        const [local, domain] = existingUser.email.split('@');
        maskedEmail = `${local.slice(0, 2)}***@${domain}`;
      }
    }
  }

  // In development with no delivery channel — return OTP in response so you can test
  const isDev = process.env.NODE_ENV === 'development';
  const noDelivery = channel === 'none' && !emailSent;

  res.json({
    success: true,
    message: channel === 'sms'
      ? `OTP sent to +91 ${phone}`
      : emailSent
        ? `OTP sent to your email (${maskedEmail})`
        : `OTP generated — check server console`,
    channel: channel === 'sms' ? 'sms' : emailSent ? 'email' : 'none',
    emailHint: emailSent ? maskedEmail : undefined,
    // Only expose OTP in dev when there's no delivery channel at all
    devOtp: (isDev && noDelivery) ? otp : undefined,
  });
};

// POST /api/auth/otp/verify
exports.verifyOtp = async (req, res) => {
  const { phone, otp, name } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
  }

  const record = await PhoneOTP.findOne({ phone });

  if (!record) {
    return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
  }

  // Brute-force guard: max 5 attempts per OTP
  if (record.attempts >= 5) {
    await PhoneOTP.deleteOne({ phone });
    return res.status(429).json({ success: false, message: 'Too many attempts. Please request a new OTP.' });
  }

  if (record.otp !== otp.trim()) {
    await PhoneOTP.findOneAndUpdate({ phone }, { $inc: { attempts: 1 } });
    const remaining = 4 - record.attempts;
    return res.status(400).json({
      success: false,
      message: `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
    });
  }

  // OTP correct — delete it immediately to prevent reuse
  await PhoneOTP.deleteOne({ phone });

  // Find or create user by phone
  let user = await User.findOne({ phone });

  if (!user) {
    // Auto-register: require a name on first login
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'New account detected. Please provide your name.',
        requiresName: true,
      });
    }
    // Generate a placeholder email so the unique index doesn't conflict
    const placeholderEmail = `phone_${phone}@arebianvedase.internal`;
    user = await User.create({
      name: name.trim(),
      email: placeholderEmail,
      phone,
      phoneVerified: true,
    });
  } else {
    user.phoneVerified = true;
    await user.save();
  }

  await claimGuestOrders(user._id, user.email);
  sendToken(user, 200, res);
};
