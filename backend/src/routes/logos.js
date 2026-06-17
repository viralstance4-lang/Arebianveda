const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, adminOnly } = require('../middleware/auth');
const {
  getAllLogos,
  createLogo,
  updateLogo,
  deleteLogo,
} = require('../controllers/logoController');

// Ensure upload dir exists
const uploadDir = path.join(__dirname, '../../uploads/logos');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `logo-${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

router.get('/', getAllLogos);
router.post('/', protect, adminOnly, upload.single('image'), createLogo);
router.put('/:id', protect, adminOnly, upload.single('image'), updateLogo);
router.delete('/:id', protect, adminOnly, deleteLogo);

module.exports = router;
