require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Test Cloudinary connection
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Verify connection by fetching account details
cloudinary.api.resources({ type: 'upload', max_results: 1 }, (error, result) => {
  if (error) {
    console.error('❌ Cloudinary Connection Failed:', error.message);
    process.exit(1);
  }
  console.log('✅ Cloudinary Connected Successfully!');
  console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
  console.log('API Key:', process.env.CLOUDINARY_API_KEY);
  process.exit(0);
});
