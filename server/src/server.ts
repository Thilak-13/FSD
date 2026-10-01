import { app } from './app';
import { config } from './config/env';
import { connectDB } from './db/connection';
import { initCronJobs } from './services/cron.service';

const startServer = async () => {
  try {
    await connectDB();
    initCronJobs();
    app.listen(config.port, () => {
      console.log(`[Server] PayVerify API listening on port ${config.port} (${config.nodeEnv})`);
      console.log(`[Server] Health check: http://localhost:${config.port}/health`);
      console.log(`[Server] Reminder cron schedule initialized: ${config.reminderCronSchedule}`);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
