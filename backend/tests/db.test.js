const mongoose = require('mongoose');
const { connectDB, disconnectDB, isMemoryDB, getMemoryServer, getSafeHost } = require('../src/config/db');

describe('Database Connection & In-Memory Fallback Policy', () => {
  const originalEnv = { ...process.env };
  const unreachableUri = 'mongodb://127.0.0.1:19999/test_unreachable_db';
  const unreachableWithCreds = 'mongodb://adminUser:superSecretPassword123@127.0.0.1:19999/test_secure_db';

  beforeEach(async () => {
    await disconnectDB();
    process.env = { ...originalEnv };
  });

  afterEach(async () => {
    await disconnectDB();
    process.env = { ...originalEnv };
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('getSafeHost helper', () => {
    it('extracts host from URI without leaking credentials', () => {
      expect(getSafeHost('mongodb://127.0.0.1:27017/payverify')).toBe('127.0.0.1:27017');
      expect(getSafeHost('mongodb://admin:secret@cluster.mongodb.net:27017/db')).toBe('cluster.mongodb.net:27017');
      expect(getSafeHost('mongodb+srv://user:pass@cluster0.abcde.mongodb.net/db')).toBe('cluster0.abcde.mongodb.net');
    });
  });

  describe('unreachable URI + no flag rejects', () => {
    it('rejects immediately when USE_MEMORY_DB is not set', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.USE_MEMORY_DB;

      await expect(
        connectDB(unreachableUri, { serverSelectionTimeoutMS: 1000 })
      ).rejects.toThrow(/127\.0\.0\.1:19999/);

      expect(isMemoryDB()).toBe(false);
    });

    it('rejects when USE_MEMORY_DB is explicitly false and hides credentials', async () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_MEMORY_DB = 'false';

      let caughtError = null;
      try {
        await connectDB(unreachableWithCreds, { serverSelectionTimeoutMS: 1000 });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toContain('127.0.0.1:19999');
      expect(caughtError.message).not.toContain('superSecretPassword123');
      expect(caughtError.message).not.toContain('adminUser:superSecretPassword123');
      expect(isMemoryDB()).toBe(false);
    });
  });

  describe('NODE_ENV=production + flag still rejects', () => {
    it('rejects immediately in production even when USE_MEMORY_DB=true', async () => {
      process.env.NODE_ENV = 'production';
      process.env.USE_MEMORY_DB = 'true';

      let caughtError = null;
      try {
        await connectDB(unreachableWithCreds, { serverSelectionTimeoutMS: 1000 });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toContain('127.0.0.1:19999');
      expect(caughtError.message).not.toContain('superSecretPassword123');
      expect(isMemoryDB()).toBe(false);
      expect(getMemoryServer()).toBeNull();
    });
  });

  describe('development + flag connects', () => {
    it('successfully falls back to in-memory MongoDB when NODE_ENV=development and USE_MEMORY_DB=true', async () => {
      process.env.NODE_ENV = 'development';
      process.env.USE_MEMORY_DB = 'true';

      const conn = await connectDB(unreachableUri, { serverSelectionTimeoutMS: 1000 });

      expect(conn).toBeDefined();
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
      expect(isMemoryDB()).toBe(true);

      const memServer = getMemoryServer();
      expect(memServer).not.toBeNull();
      const memUri = memServer.getUri();
      expect(memUri).toMatch(/^mongodb:\/\/127\.0\.0\.1:\d+\//);

      await disconnectDB();
      expect(isMemoryDB()).toBe(false);
      expect(mongoose.connection.readyState).toBe(0); // 0 = disconnected
    });
  });
});
