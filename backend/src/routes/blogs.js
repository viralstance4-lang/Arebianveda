const express = require('express');
const router = express.Router();
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const { uploadMedia } = require('../config/cloudinary');
const blogCtrl = require('../controllers/blogController');

// Public
router.get('/', optionalAuth, blogCtrl.listBlogs);
router.get('/featured', optionalAuth, blogCtrl.listBlogs);
router.get('/sitemap.xml', blogCtrl.sitemap);

// Upload images (admin)
router.post('/upload', protect, adminOnly, uploadMedia.array('files', 12), blogCtrl.uploadImages);

// Admin CRUD
router.post('/', protect, adminOnly, blogCtrl.createBlog);
router.put('/:id', protect, adminOnly, blogCtrl.updateBlog);
router.delete('/:id', protect, adminOnly, blogCtrl.deleteBlog);
router.post('/:id/duplicate', protect, adminOnly, blogCtrl.duplicateBlog);
router.get('/:id/related', blogCtrl.relatedBlogs);
router.get('/preview/:id', protect, adminOnly, blogCtrl.getBlogById);

router.get('/:slug', optionalAuth, blogCtrl.getBlog);

module.exports = router;
