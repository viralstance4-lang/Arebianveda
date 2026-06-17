const path = require('path');
const fs = require('fs');
const Concern = require('../models/Concern');
const { cloudinary } = require('../config/cloudinary');

// multer-storage-cloudinary v4: file.path = secure_url, file.filename = public_id
// multer disk storage:          file.path = absolute fs path, file.filename = basename
const fileToImage = (file, req) => {
  const isCloudinary = file.path?.startsWith('http');
  const backendOrigin = `${req.protocol}://${req.get('host')}`;
  return {
    url: isCloudinary ? file.path : `${backendOrigin}/uploads/concerns/${file.filename}`,
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
  const filePath = path.join(__dirname, '../../uploads/concerns', path.basename(url));
  fs.unlink(filePath, () => {});
};

const removeImage = async (url, publicId) => {
  await destroyCloudinaryImage(publicId);
  deleteDiskImage(url);
};

// ─── GET /api/concerns/active — public, used by storefront homepage ───────────
exports.getActiveConcerns = async (_req, res) => {
  const concerns = await Concern.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 });
  res.json({ success: true, count: concerns.length, concerns });
};

// ─── GET /api/concerns — admin, all concerns ────────────────────────────────────
exports.getAllConcerns = async (_req, res) => {
  const concerns = await Concern.find().sort({ displayOrder: 1, createdAt: -1 });
  res.json({ success: true, count: concerns.length, concerns });
};

// ─── GET /api/concerns/:id ────────────────────────────────────────────────────────
exports.getConcern = async (req, res) => {
  const concern = await Concern.findById(req.params.id);
  if (!concern) return res.status(404).json({ success: false, message: 'Concern not found' });
  res.json({ success: true, concern });
};

// ─── POST /api/concerns ───────────────────────────────────────────────────────────
exports.createConcern = async (req, res) => {
  const { label, icon, colorTheme, link, displayOrder, isActive } = req.body;

  const image = req.file ? fileToImage(req.file, req) : null;

  const concern = await Concern.create({
    label,
    icon,
    image: image?.url || '',
    imagePublicId: image?.publicId || null,
    colorTheme: colorTheme || 'green',
    link,
    displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
    isActive: isActive === undefined ? true : (isActive === 'true' || isActive === true),
  });

  res.status(201).json({ success: true, concern });
};

// ─── PUT /api/concerns/:id ─────────────────────────────────────────────────────────
exports.updateConcern = async (req, res) => {
  const concern = await Concern.findById(req.params.id);
  if (!concern) return res.status(404).json({ success: false, message: 'Concern not found' });

  const { label, icon, colorTheme, link, displayOrder, isActive, removeImage: removeImageFlag } = req.body;

  if (req.file) {
    await removeImage(concern.image, concern.imagePublicId);
    const image = fileToImage(req.file, req);
    concern.image = image.url;
    concern.imagePublicId = image.publicId;
  } else if (removeImageFlag === 'true' && concern.image) {
    await removeImage(concern.image, concern.imagePublicId);
    concern.image = '';
    concern.imagePublicId = null;
  }

  if (label !== undefined) concern.label = label;
  if (icon !== undefined) concern.icon = icon;
  if (colorTheme !== undefined) concern.colorTheme = colorTheme;
  if (link !== undefined) concern.link = link;
  if (displayOrder !== undefined) concern.displayOrder = Number(displayOrder);
  if (isActive !== undefined) concern.isActive = (isActive === 'true' || isActive === true);

  await concern.save();
  res.json({ success: true, concern });
};

// ─── DELETE /api/concerns/:id ──────────────────────────────────────────────────────
exports.deleteConcern = async (req, res) => {
  const concern = await Concern.findById(req.params.id);
  if (!concern) return res.status(404).json({ success: false, message: 'Concern not found' });

  await removeImage(concern.image, concern.imagePublicId);

  await concern.deleteOne();
  res.json({ success: true, message: 'Concern deleted' });
};

// ─── PUT /api/concerns/reorder ──────────────────────────────────────────────────────
// body: { order: [{ _id, displayOrder }, ...] }
exports.reorderConcerns = async (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) {
    return res.status(400).json({ success: false, message: 'order must be an array of { _id, displayOrder }' });
  }

  await Promise.all(
    order.map(({ _id, displayOrder }) => Concern.findByIdAndUpdate(_id, { displayOrder }))
  );

  const concerns = await Concern.find().sort({ displayOrder: 1, createdAt: -1 });
  res.json({ success: true, concerns });
};
