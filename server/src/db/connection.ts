import mongoose from 'mongoose';
import { config } from '../config/env';

export const connectDB = async (uri?: string): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  const dbUri = uri || config.mongodbUri;
  try {
    const conn = await mongoose.connect(dbUri);
    console.log(`[MongoDB] Connected to database: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected from database');
  } catch (error) {
    console.error('[MongoDB] Disconnect error:', error);
    throw error;
  }
};
