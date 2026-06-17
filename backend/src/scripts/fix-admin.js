require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function fixAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Remove ALL old admin accounts
  const deleted = await User.deleteMany({ role: 'admin' });
  console.log(`Deleted ${deleted.deletedCount} old admin user(s)`);

  // Create fresh admin with new credentials from .env
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ADMIN_EMAIL or ADMIN_PASSWORD missing in .env');
    process.exit(1);
  }

  await User.create({ name: 'Arebianveda Admin', email, password, role: 'admin', isVerified: true });
  console.log(`New admin created: ${email}`);

  await mongoose.disconnect();
  process.exit(0);
}

fixAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
