const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from default locations
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

/**
 * Creates an Admin user for production deployments.
 * Reads configuration from environment variables:
 * - INITIAL_ADMIN_EMAIL (default: admin@payverify.local)
 * - INITIAL_ADMIN_PASSWORD (required, >= 12 chars, != 'change_this_in_production')
 * - INITIAL_ADMIN_NAME (default: Administrator)
 * - INITIAL_ADMIN_DEPARTMENT (default: Administration)
 * - MONGODB_URI (default: mongodb://127.0.0.1:27017/payverify)
 */
async function createAdmin() {
  const email = (process.env.INITIAL_ADMIN_EMAIL || 'admin@payverify.local').trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const name = (process.env.INITIAL_ADMIN_NAME || 'Administrator').trim();
  const department = (process.env.INITIAL_ADMIN_DEPARTMENT || 'Administration').trim();
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/payverify';

  if (!password || password.trim() === '') {
    console.error('Error: INITIAL_ADMIN_PASSWORD is required and cannot be empty.');
    process.exit(1);
  }
  if (password === 'change_this_in_production') {
    console.error('Error: INITIAL_ADMIN_PASSWORD cannot be "change_this_in_production". Please provide a secure password.');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error(`Error: INITIAL_ADMIN_PASSWORD must be at least 12 characters long (received ${password.length}).`);
    process.exit(1);
  }

  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  try {
    const existing = await User.findOne({ email });

    if (existing) {
      console.log(`User with email "${email}" already exists. Skipping admin creation.`);
      return;
    }

    console.log(`Creating initial admin user "${email}"...`);
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'Admin',
      department,
    });
    console.log(`Admin user "${email}" (ID: ${user._id}) created successfully.`);
  } catch (err) {
    console.error('Error creating admin user:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

if (require.main === module) {
  createAdmin();
}

module.exports = { createAdmin };
