const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

let memoryServerInstance = null;
let isUsingMemoryServer = false;

/**
 * Extracts the host (hostname:port) from a MongoDB URI without leaking credentials.
 * @param {string} targetUri
 * @returns {string} Safe host representation
 */
function getSafeHost(targetUri) {
  if (!targetUri || typeof targetUri !== 'string') return 'unknown';
  try {
    const parsed = new URL(targetUri);
    return parsed.host || parsed.hostname;
  } catch {
    const match = targetUri.match(/@([^/?#]+)/) || targetUri.match(/:\/\/(?:[^@/]+@)?([^/?#]+)/);
    return match ? match[1] : 'unknown host';
  }
}

/**
 * Strips user:password credentials from error messages if present.
 * @param {string} msg
 * @param {string} targetUri
 * @returns {string}
 */
function sanitizeMessage(msg, targetUri) {
  if (!msg) return '';
  const credMatch = targetUri.match(/:\/\/(.*?@)/);
  if (credMatch && credMatch[1]) {
    return msg.replaceAll(credMatch[1], '');
  }
  return msg;
}

/**
 * Connect to MongoDB database.
 * Handles existing active connection or in-progress connecting states gracefully.
 * In-memory fallback is strictly opt-in: only when NODE_ENV === 'development' AND USE_MEMORY_DB === 'true'.
 * In every other case, a failed connection throws immediately with the URI host (no credentials).
 *
 * @param {string} [uri] - Optional MongoDB URI override
 * @param {object} [options] - Optional mongoose connect options
 * @returns {Promise<typeof mongoose>}
 */
const connectDB = async (uri, options = {}) => {
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

  const isLocalTarget = targetUri.includes('localhost') || targetUri.includes('127.0.0.1');
  const timeoutMs = options.serverSelectionTimeoutMS || (isLocalTarget ? 2000 : 5000);

  try {
    const conn = await mongoose.connect(targetUri, {
      serverSelectionTimeoutMS: timeoutMs,
      ...options,
    });
    isUsingMemoryServer = false;
    return conn;
  } catch (error) {
    const isDev = (process.env.NODE_ENV || 'development') === 'development';
    const useMemoryDB = process.env.USE_MEMORY_DB === 'true';
    const allowFallback = isDev && useMemoryDB && !options.disableMemoryFallback;

    if (allowFallback) {
      console.warn(`[MongoDB] Primary connection failed: ${sanitizeMessage(error.message, targetUri)}`);
      try {
        // Lazily require mongodb-memory-server inside fallback branch only
        const { MongoMemoryServer } = require('mongodb-memory-server');
        if (!memoryServerInstance) {
          memoryServerInstance = await MongoMemoryServer.create();
        }
        const memUri = memoryServerInstance.getUri();
        isUsingMemoryServer = true;

        console.warn('====================================================================');
        console.warn('⚠️  USING EPHEMERAL IN-MEMORY DATABASE: DATA WILL BE LOST ON EXIT ⚠️');
        console.warn(`    URI: ${memUri}`);
        console.warn('====================================================================');

        const conn = await mongoose.connect(memUri);
        return conn;
      } catch (memErr) {
        console.error('[MongoDB] Failed to start in-memory MongoDB fallback:', memErr.message);
        throw memErr;
      }
    }

    // In every other case a failed connection must throw immediately, with the URI host (no credentials) in the message.
    const safeHost = getSafeHost(targetUri);
    const safeReason = sanitizeMessage(error.message, targetUri);
    const failureError = new Error(`Failed to connect to MongoDB at ${safeHost}: ${safeReason}`);
    failureError.host = safeHost;
    throw failureError;
  }
};

/**
 * Disconnect from MongoDB database.
 * Gracefully ignores if already disconnected and terminates in-memory server if running.
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
      memoryServerInstance = null;
    }
    isUsingMemoryServer = false;
  } catch (error) {
    console.error('[MongoDB] Disconnect error:', error.message);
    throw error;
  }
};

const getMemoryServer = () => memoryServerInstance;
const isMemoryDB = () => isUsingMemoryServer;

module.exports = {
  connectDB,
  disconnectDB,
  getMemoryServer,
  isMemoryDB,
  getSafeHost,
};
