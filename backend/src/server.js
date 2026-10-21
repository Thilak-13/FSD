const app = require('./app');
const { PORT, MONGODB_URI } = require('./config/env');
const { connectDB, disconnectDB, isMemoryDB } = require('./config/db');
const { seedDatabase } = require('./config/seed');
const { initReminderCron, stopReminderCron } = require('./jobs/reminderCron');

let server = null;

const startServer = async () => {
  try {
    if (process.env.USE_MEMORY_DB === undefined && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      process.env.USE_MEMORY_DB = 'true';
    }
    // 1. Connect to MongoDB
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
    await connectDB(MONGODB_URI);
    console.log('MongoDB connected successfully.');

    // 2. Seed database demo data if gate passes or if running on in-memory DB
    const isMemory = isMemoryDB();
    if (process.env.SEED_DEMO_DATA === 'true' || isMemory) {
      if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development' && !isMemory) {
        console.warn('WARNING: SEED_DEMO_DATA is enabled in production! Demo credentials will be active.');
      }
      console.log('Seeding demo database...');
      await seedDatabase();
      console.log('Demo database seeded successfully.');
    }

    // 3. Initialize scheduled background jobs
    initReminderCron('0 8 * * *');
    console.log('Reminder cron job initialized (daily at 08:00).');

    // 4. Start HTTP server
    server = app.listen(PORT, () => {
      console.log(`PayVerify backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  stopReminderCron();
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed.');
      await disconnectDB();
      console.log('MongoDB disconnected.');
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

if (require.main === module) {
  startServer();
}

module.exports = { startServer, gracefulShutdown };
