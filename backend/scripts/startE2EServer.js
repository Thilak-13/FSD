// backend/scripts/startE2EServer.js
const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';
process.env.PORT = '5000';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'super_secret_payverify_jwt_key_2026_round2!';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../src/app');
const { seedDatabase } = require('../src/config/seed');
const Invoice = require('../src/models/Invoice');

let mongod = null;
let server = null;

async function startServer() {
  // 1. Spin up in-memory Mongo instance
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // 2. Connect mongoose
  await mongoose.connect(uri);
  console.log(`Connected to MongoMemoryServer at ${uri}`);

  // 3. Call seedDatabase({ force: true })
  await seedDatabase({ force: true });

  // Ensure sample upload attachment exists on disk for attachment download tests
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const samplePdfPath = path.join(uploadsDir, 'sample-attachment.pdf');
  if (!fs.existsSync(samplePdfPath)) {
    fs.writeFileSync(samplePdfPath, '%PDF-1.4 PayVerify E2E Attachment\n%%EOF');
  }

  // Ensure seeded invoices with attached documents have valid attachedDocumentPath set
  await Invoice.updateMany(
    { attachedDocumentName: { $exists: true, $ne: null } },
    { $set: { attachedDocumentPath: 'uploads/sample-attachment.pdf' } }
  );

  // 4. Start Express app on port 5000
  server = app.listen(5000, () => {
    console.log('E2E Backend ready on port 5000');
  });

  // 5. Handle SIGINT/SIGTERM to close server, disconnect mongoose, and stop mongod
  const shutdown = async (signal) => {
    console.log(`Received ${signal}. Shutting down E2E backend server...`);
    if (server) {
      server.close();
    }
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('Failed to start E2E server:', err);
  process.exit(1);
});
