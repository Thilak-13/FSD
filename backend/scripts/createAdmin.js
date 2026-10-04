const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from default locations
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

/**
 * Creates or updates an Admin user for production deployments.
 * Reads configuration from environment variables:
 * - INITIAL_ADMIN_EMAIL (default: admin@payverify.local)
 * - INITIAL_ADMIN_PASSWORD (default: AdminPass123!)
 * - INITIAL_ADMIN_NAME (default: Elena Rodriguez)
 * - INITIAL_ADMIN_DEPARTMENT (default: Administration)
 * - MONGODB_URI (default: mongodb://127.0.0.1:27017/payverify)
 */
async function createAdmin() {
  const email = (process.env.INITIAL_ADMIN_EMAIL || 'admin@payverify.local').trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD || 'AdminPass123!';
  const name = (process.env.INITIAL_ADMIN_NAME || 'Elena Rodriguez').trim();
  const department = (process.env.INITIAL_ADMIN_DEPARTMENT || 'Administration').trim();
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/payverify';

  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const existing = await User.findOne({ email });

    if (existing) {
      console.log(`User with email "${email}" already exists. Ensuring Admin role and updating password...`);
      existing.name = name;
      existing.role = 'Admin';
      existing.passwordHash = passwordHash;
      existing.department = department;
      await existing.save();
      console.log(`Admin user "${email}" updated successfully.`);
    } else {
      console.log(`Creating initial admin user "${email}"...`);
      const user = await User.create({
        name,
        email,
        passwordHash,
        role: 'Admin',
        department,
      });
      console.log(`Admin user "${email}" (ID: ${user._id}) created successfully.`);
    }
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
