const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

/**
 * Connect to MongoDB database.
 * Handles existing active connection or in-progress connecting states gracefully.
 * @param {string} [uri] - Optional MongoDB URI override
 * @returns {Promise<typeof mongoose>}
 */
const connectDB = async (uri) => {
  const targetUri = uri || MONGODB_URI;

  // 1 = connected
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // 2 = connecting - wait until connected
  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve, reject) => {
      mongoose.connection.once('connected', resolve);
      mongoose.connection.once('error', reject);
    });
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(targetUri);
    return conn;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error.message);
    throw error;
  }
};

/**
 * Disconnect from MongoDB database.
 * Gracefully ignores if already disconnected.
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error('[MongoDB] Disconnect error:', error.message);
    throw error;
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
