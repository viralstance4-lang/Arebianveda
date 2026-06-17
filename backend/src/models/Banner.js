const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: '',
      trim: true,
    },
    subtitle: {
      type: String,
      default: '',
      trim: true,
    },
    altText: {
      type: String,
      default: '',
      trim: true,
    },

    desktopImage: {
      type: String,
      required: [true, 'Desktop banner image is required'],
    },
    desktopImagePublicId: {
      type: String,
      default: null,
    },
    mobileImage: {
      type: String,
      default: '',
    },
    mobileImagePublicId: {
      type: String,
      default: null,
    },

    buttonText: { type: String, default: '', trim: true },
    buttonUrl: { type: String, default: '', trim: true },
    secondaryButtonText: { type: String, default: '', trim: true },
    secondaryButtonUrl: { type: String, default: '', trim: true },

    clickUrl: { type: String, default: '', trim: true },

    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);
