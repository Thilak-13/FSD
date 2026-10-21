const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isTest = nodeEnv === 'test';
const isDev = nodeEnv === 'development';
const isProductionLike = !isTest && !isDev;

// Fail-fast guard: JWT_SECRET must be explicitly set outside test environment with no fallback default
if (!isTest && (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '')) {
  throw new Error('FATAL: JWT_SECRET environment variable is required outside the test environment.');
}

// Production hardening: disallow default placeholder and require >= 32 characters in any non-test/non-dev environment
if (isProductionLike) {
  if (process.env.JWT_SECRET === 'supersecret_dev_jwt_key_change_in_production') {
    throw new Error('FATAL: JWT_SECRET cannot be the default placeholder "supersecret_dev_jwt_key_change_in_production" in production.');
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error(`FATAL: JWT_SECRET must be at least 32 characters in production (received ${process.env.JWT_SECRET.length}).`);
  }
}

const PORT = parseInt(process.env.PORT, 10) || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payverify';
const JWT_SECRET = process.env.JWT_SECRET || (isTest ? 'test_jwt_secret_dev_12345' : '');
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.ethereal.email';
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

module.exports = {
  PORT,
  MONGODB_URI,
  JWT_SECRET,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  CLIENT_ORIGIN,
  // Helper aliases
  port: PORT,
  mongodbUri: MONGODB_URI,
  jwtSecret: JWT_SECRET,
  clientOrigin: CLIENT_ORIGIN,
  config: {
    PORT,
    MONGODB_URI,
    JWT_SECRET,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    CLIENT_ORIGIN,
    port: PORT,
    mongodbUri: MONGODB_URI,
    jwtSecret: JWT_SECRET,
  },
};
