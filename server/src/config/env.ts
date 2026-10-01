import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/payverify',
  jwtSecret: process.env.JWT_SECRET || 'supersecret_dev_jwt_key_change_in_production',
  jwtExpiresIn: '8h',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || 'test@ethereal.email',
    pass: process.env.SMTP_PASS || 'testpassword',
    from: process.env.EMAIL_FROM || 'PayVerify Alerts <alerts@payverify.local>',
  },
  reminderCronSchedule: process.env.REMINDER_CRON_SCHEDULE || '0 8 * * *',
  uploadDir: path.resolve(__dirname, '../../uploads'),
};
