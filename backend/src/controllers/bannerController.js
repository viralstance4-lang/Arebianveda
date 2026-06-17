const path = require('path');
const fs = require('fs');
const Banner = require('../models/Banner');
const { cloudinary } = require('../config/cloudinary');

// multer-storage-cloudinary v4: file.path = secure_url, file.filename = public_id
// multer disk storage:          file.path = absolute fs path, file.filename = basename
const fileToImage = (file, req) => {
  const isCloudinary = file.path?.startsWith('http');
  const backendOrigin = `${req.protocol}://${req.get('host')}`;
  return {
    url: isCloudinary ? file.path : `${backendOrigin}/uploads/banners/${file.filename}`,
    publicId: isCloudinary ? file.filename : null,
  };
};

const destroyCloudinaryImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    console.error('[Cloudinary] destroy failed:', err.message);
  }
};

const deleteDiskImage = (url) => {
  if (!url || url.startsWith('http')) return;
  const filePath = path.join(__dirname, '../../uploads/banners', path.basename(url));
  fs.unlink(filePath, () => {});
};

const removeImage = async (url, publicId) => {
  await destroyCloudinaryImage(publicId);
  deleteDiskImage(url);
};

// ─── GET /api/banners/active — public, used by storefront hero slider ─────────
exports.getActiveBanners = async (_req, res) => {
  const banners = await Banner.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });

  res.json({ success: true, count: banners.length, banners });
};

// ─── GET /api/banners — admin, all banners ──────────────────────────────────────
exports.getAllBanners = async (_req, res) => {
  const banners = await Banner.find().sort({ displayOrder: 1, createdAt: -1 });
  res.json({ success: true, count: banners.length, banners });
};

// ─── GET /api/banners/:id ────────────────────────────────────────────────────────
exports.getBanner = async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });
  res.json({ success: true, banner });
};

// ─── POST /api/banners ───────────────────────────────────────────────────────────
exports.createBanner = async (req, res) => {
  const desktopFile = req.files?.desktopImage?.[0];
  if (!desktopFile) {
    return res.status(400).json({ success: false, message: 'Desktop banner image is required' });
  }

  const desktop = fileToImage(desktopFile, req);
  const mobileFile = req.files?.mobileImage?.[0];
  const mobile = mobileFile ? fileToImage(mobileFile, req) : null;

  const {
    title, subtitle, altText,
    buttonText, buttonUrl, secondaryButtonText, secondaryButtonUrl,
    clickUrl, displayOrder, isActive,
  } = req.body;

  const banner = await Banner.create({
    title,
    subtitle,
    altText: altText || title,
    desktopImage: desktop.url,
    desktopImagePublicId: desktop.publicId,
    mobileImage: mobile?.url || '',
    mobileImagePublicId: mobile?.publicId || null,
    buttonText, buttonUrl, secondaryButtonText, secondaryButtonUrl,
    clickUrl,
    displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
    isActive: isActive === undefined ? true : (isActive === 'true' || isActive === true),
  });

  res.status(201).json({ success: true, banner });
};

// ─── PUT /api/banners/:id ─────────────────────────────────────────────────────────
exports.updateBanner = async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

  const {
    title, subtitle, altText,
    buttonText, buttonUrl, secondaryButtonText, secondaryButtonUrl,
    clickUrl, displayOrder, isActive,
  } = req.body;

  const desktopFile = req.files?.desktopImage?.[0];
  if (desktopFile) {
    await removeImage(banner.desktopImage, banner.desktopImagePublicId);
    const desktop = fileToImage(desktopFile, req);
    banner.desktopImage = desktop.url;
    banner.desktopImagePublicId = desktop.publicId;
  }

  const mobileFile = req.files?.mobileImage?.[0];
  if (mobileFile) {
    await removeImage(banner.mobileImage, banner.mobileImagePublicId);
    const mobile = fileToImage(mobileFile, req);
    banner.mobileImage = mobile.url;
    banner.mobileImagePublicId = mobile.publicId;
  }

  if (title !== undefined) banner.title = title;
  if (subtitle !== undefined) banner.subtitle = subtitle;
  if (altText !== undefined) banner.altText = altText;
  if (buttonText !== undefined) banner.buttonText = buttonText;
  if (buttonUrl !== undefined) banner.buttonUrl = buttonUrl;
  if (secondaryButtonText !== undefined) banner.secondaryButtonText = secondaryButtonText;
  if (secondaryButtonUrl !== undefined) banner.secondaryButtonUrl = secondaryButtonUrl;
  if (clickUrl !== undefined) banner.clickUrl = clickUrl;
  if (displayOrder !== undefined) banner.displayOrder = Number(displayOrder);
  if (isActive !== undefined) banner.isActive = (isActive === 'true' || isActive === true);

  await banner.save();
  res.json({ success: true, banner });
};

// ─── DELETE /api/banners/:id ──────────────────────────────────────────────────────
exports.deleteBanner = async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

  await removeImage(banner.desktopImage, banner.desktopImagePublicId);
  await removeImage(banner.mobileImage, banner.mobileImagePublicId);

  await banner.deleteOne();
  res.json({ success: true, message: 'Banner deleted' });
};

// ─── POST /api/banners/:id/duplicate ───────────────────────────────────────────────
exports.duplicateBanner = async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) return res.status(404).json({ success: false, message: 'Banner not found' });

  const data = banner.toObject();
  delete data._id;
  delete data.createdAt;
  delete data.updatedAt;
  delete data.__v;

  // The copy reuses the same image URLs but never claims ownership of the
  // original's Cloudinary asset — deleting the copy must not destroy the original.
  data.desktopImagePublicId = null;
  data.mobileImagePublicId = null;
  data.title = `${data.title} (Copy)`;
  data.isActive = false;

  const last = await Banner.findOne().sort({ displayOrder: -1 }).select('displayOrder');
  data.displayOrder = (last?.displayOrder ?? -1) + 1;

  const copy = await Banner.create(data);
  res.status(201).json({ success: true, banner: copy });
};

// ─── PUT /api/banners/reorder ──────────────────────────────────────────────────────
// body: { order: [{ _id, displayOrder }, ...] }
exports.reorderBanners = async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) {
    return res.status(400).json({ success: false, message: 'order must be an array of { _id, displayOrder }' });
  }

  await Promise.all(
    order.map(({ _id, displayOrder }) => Banner.findByIdAndUpdate(_id, { displayOrder }))
  );

  const banners = await Banner.find().sort({ displayOrder: 1, createdAt: -1 });
  res.json({ success: true, banners });
};
