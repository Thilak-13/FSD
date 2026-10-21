// backend/scripts/seed.js
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment configuration
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { seedDatabase } = require('../src/config/seed');

/**
 * Connects to MongoDB (or MongoMemoryServer) and executes seedDatabase({ force: true }).
 * Can be run standalone from CLI or imported as a function.
 */
async function runSeed() {
  let mongod = null;
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/payverify';

  console.log('====================================================');
  console.log('  PayVerify Enterprise Data Seeder (1-Month Dataset)');
  console.log('====================================================');

  let connected = false;

  try {
    console.log(`Connecting to MongoDB at: ${mongoUri} (timeout 3000ms)...`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log('Successfully connected to MongoDB.');
    connected = true;
  } catch (err) {
    console.warn(`Could not connect to external MongoDB: ${err.message}`);
    console.log('Spinning up MongoMemoryServer fallback for in-memory execution...');
    mongod = await MongoMemoryServer.create();
    const memoryUri = mongod.getUri();
    await mongoose.connect(memoryUri);
    console.log(`Connected to MongoMemoryServer at: ${memoryUri}`);
    connected = true;
  }

  try {
    console.log('\nExecuting seedDatabase({ force: true })...');
    const result = await seedDatabase({ force: true });

    console.log('\nSeeding completed successfully!');
    console.log('----------------------------------------------------');
    console.log(`Users Created:            ${result.usersCreated}`);
    console.log(`Vendors Created:          ${result.vendorsCreated}`);
    console.log(`Purchase Orders Created:  ${result.purchaseOrdersCreated}`);
    console.log(`Invoices Created:         ${result.invoicesCreated}`);
    console.log(`Audit Entries Created:    ${result.auditEntriesCreated}`);
    console.log('----------------------------------------------------');

    return result;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
  }
}

if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('Database seeding process finished.\n');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database seeding failed:', err);
      process.exit(1);
    });
}

module.exports = { runSeed };
