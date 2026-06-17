const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    url:      { type: String, required: true },
    publicId: { type: String, required: true },
    type:     { type: String, enum: ['image', 'video', 'pdf'], required: true },
    filename: { type: String, default: '' },   // original file name
    format:   { type: String, default: '' },   // jpg, png, mp4 …
    size:     { type: Number, default: 0 },    // bytes
  },
  { timestamps: true }
);

module.exports = mongoose.model('Media', mediaSchema);
