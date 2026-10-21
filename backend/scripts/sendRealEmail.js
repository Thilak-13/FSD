const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Invoice = require('../src/models/Invoice');
const { runReminderScan } = require('../src/jobs/reminderCron');
const {
  setTransporter,
  getLastSentMail,
  resetTransporter,
} = require('../src/services/emailService');

async function sendRealEmailViaAppPath() {
  let mongod;
  try {
    console.log('--- Initializing Ephemeral MongoMemoryServer ---');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('Connected to ephemeral MongoDB instance.');

    console.log('--- Generating real Ethereal SMTP test account ---');
    const testAccount = await nodemailer.createTestAccount();
    console.log(`Ethereal user: ${testAccount.user}`);
    console.log(`Ethereal SMTP: ${testAccount.smtp.host}:${testAccount.smtp.port}`);

    // Set environment variables for app configuration
    process.env.SMTP_HOST = testAccount.smtp.host;
    process.env.SMTP_PORT = String(testAccount.smtp.port);
    process.env.SMTP_USER = testAccount.user;
    process.env.SMTP_PASS = testAccount.pass;

    // Create real Ethereal SMTP transport and set it on the app emailService
    const realTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    setTransporter(realTransporter);

    console.log('--- Seeding overdue invoice into MongoDB ---');
    const overdueInvoice = await Invoice.create({
      invoiceNumber: 'INV-REAL-OVERDUE-001',
      vendorId: new mongoose.Types.ObjectId(),
      amount: 4850.0,
      status: 'Approved',
      submittedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      submittedBy: new mongoose.Types.ObjectId(),
    });
    console.log(`Seeded overdue invoice: ${overdueInvoice.invoiceNumber} (Amount: ₹${overdueInvoice.amount}, Status: ${overdueInvoice.status})`);

    console.log('--- Invoking runReminderScan through app path ---');
    const scanResult = await runReminderScan(new Date(), testAccount.user);
    console.log('Scan result summary:', {
      totalScanned: scanResult.totalScanned,
      overdueCount: scanResult.overdueCount,
      emailSent: scanResult.emailSent,
      recipient: scanResult.recipient,
    });

    const lastMail = getLastSentMail();
    const mailResult = scanResult.mailResult || lastMail?.result;
    if (!mailResult) {
      throw new Error('Email was not dispatched by runReminderScan');
    }

    const messageId = mailResult.messageId;
    const previewUrl = nodemailer.getTestMessageUrl(mailResult);

    console.log('--- Email Dispatch Complete ---');
    console.log(`Message ID: ${messageId}`);
    console.log(`Preview URL: ${previewUrl}`);

    return { messageId, previewUrl };
  } finally {
    resetTransporter();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
  }
}

sendRealEmailViaAppPath()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Email dispatch script failed:', err);
    process.exit(1);
  });
