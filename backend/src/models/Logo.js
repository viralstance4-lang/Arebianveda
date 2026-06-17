const mongoose = require('mongoose');

const logoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Logo name is required'],
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, 'Logo image is required'],
    },
    publicId: {
      type: String,
    },
    altText: {
      type: String,
      default: '',
      trim: true,
    },
    width: {
      type: String,
      default: '120px',
    },
    height: {
      type: String,
      default: 'auto',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Logo', logoSchema);
