const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isTest = process.env.NODE_ENV === 'test';

// Fail-fast guard: JWT_SECRET must be explicitly set outside test environment with no fallback default
if (!isTest && (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '')) {
  throw new Error('FATAL: JWT_SECRET environment variable is required outside the test environment.');
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
