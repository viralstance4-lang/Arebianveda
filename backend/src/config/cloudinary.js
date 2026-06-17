const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Check whether real Cloudinary credentials are present
// Rejects blank values and common placeholder strings
const PLACEHOLDERS = new Set(['placeholder', 'your_cloud_name', 'your_api_key', 'your_api_secret', 'xxx']);
const isReal = (v) => v && !PLACEHOLDERS.has(v.toLowerCase());

const isCloudinaryConfigured = !!(
  isReal(process.env.CLOUDINARY_CLOUD_NAME) &&
  isReal(process.env.CLOUDINARY_API_KEY) &&
  isReal(process.env.CLOUDINARY_API_SECRET)
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.warn('[upload] ⚠  Cloudinary env vars not set — falling back to local disk storage');
}

// ─── Helper: create a disk-storage instance for a given subfolder ─────────────
function diskStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '../../uploads', subfolder);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
}

// ─── Product image upload ─────────────────────────────────────────────────────
const productStorage = isCloudinaryConfigured
  ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'arebianveda/products',
      },
    })
  : diskStorage('products');

const upload = multer({
  storage: productStorage,
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

// ─── Media Library upload (images + videos + PDFs) ─────────────────────────────
const mediaStorage = isCloudinaryConfigured
  ? new CloudinaryStorage({
      cloudinary,
      params: async (req, file) => {
        if (file.mimetype === 'application/pdf') {
          // raw resources use public_id verbatim as the delivery URL path —
          // append .pdf so links open inline instead of downloading as an extensionless file
          const base = path.basename(file.originalname, path.extname(file.originalname))
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .slice(0, 60);
          return { folder: 'arebianveda/media', resource_type: 'raw', public_id: `${base}-${Date.now()}.pdf` };
        }
        return {
          folder:        'arebianveda/media',
          resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
        };
      },
    })
  : diskStorage('media');

const uploadMedia = multer({
  storage: mediaStorage,
  limits:  { fileSize: 100 * 1024 * 1024 }, // 100 MB (for videos)
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image, video, and PDF files are allowed'), false);
    }
  },
});

// ─── Homepage banner upload (desktop + mobile images) ──────────────────────────
const bannerStorage = isCloudinaryConfigured
  ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'arebianveda/banners',
      },
    })
  : diskStorage('banners');

const uploadBanner = multer({
  storage: bannerStorage,
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

// ─── Shop-by-Concern card image upload ──────────────────────────────────────
const concernStorage = isCloudinaryConfigured
  ? new CloudinaryStorage({
      cloudinary,
      params: {
        folder: 'arebianveda/concerns',
      },
    })
  : diskStorage('concerns');

const uploadConcern = multer({
  storage: concernStorage,
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

module.exports = { cloudinary, upload, uploadMedia, uploadBanner, uploadConcern, isCloudinaryConfigured };
