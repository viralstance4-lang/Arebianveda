const mongoose = require('mongoose');

const concernSchema = new mongoose.Schema(
  {
    label: { type: String, default: '', trim: true },

    // Either an emoji icon or an uploaded image is shown — image takes priority.
    icon: { type: String, default: '', trim: true },
    image: { type: String, default: '' },
    imagePublicId: { type: String, default: null },

    colorTheme: { type: String, default: 'green', trim: true },
    link: { type: String, default: '', trim: true },

    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Concern', concernSchema);
