const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, adminOnly } = require('../middleware/auth');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const {
  getShipping,
  updateShipping,
  getSiteSettings,
  updateSiteLogo,
} = require('../controllers/shippingController');

// Logo upload — Cloudinary if configured, else local disk
let logoStorage;
if (isCloudinaryConfigured) {
  logoStorage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'arebianveda/logos' },
  });
} else {
  const logoUploadDir = path.join(__dirname, '../../uploads/logos');
  if (!fs.existsSync(logoUploadDir)) fs.mkdirSync(logoUploadDir, { recursive: true });
  logoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, logoUploadDir),
    filename:    (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `site-logo-${Date.now()}${ext}`);
    },
  });
}

const logoUpload = multer({
  storage: logoStorage,
  limits:     { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// Public
router.get('/',         getSiteSettings);
router.get('/shipping', getShipping);

// Admin
router.put('/logo',     protect, adminOnly, logoUpload.single('logo'), updateSiteLogo);
router.put('/shipping', protect, adminOnly, updateShipping);

module.exports = router;
