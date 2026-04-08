let createClient = null;
try {
  ({ createClient } = require('redis'));
} catch (error) {
  createClient = null;
}

const redisUrl = process.env.REDIS_URL && process.env.REDIS_URL.trim()
  ? process.env.REDIS_URL.trim()
  : null;

const memoryStore = new Map();
const memoryTimers = new Map();

let redisClient = null;
let redisConnectPromise = null;
let redisDisabled = false;

const cleanupMemoryEntry = (key) => {
  const timer = memoryTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    memoryTimers.delete(key);
  }
  memoryStore.delete(key);
};

const ensureRedisClient = async () => {
  if (!redisUrl || !createClient || redisDisabled) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({ url: redisUrl });

    redisClient.on('error', (error) => {
      redisDisabled = true;
      console.warn('[OTP Store] Redis error, falling back to memory store:', error.message);
    });
  }

  if (!redisClient.isOpen && !redisConnectPromise) {
    redisConnectPromise = redisClient.connect()
      .then(() => redisClient)
      .catch((error) => {
        redisDisabled = true;
        console.warn('[OTP Store] Redis unavailable, falling back to memory store:', error.message);
        return null;
      })
      .finally(() => {
        redisConnectPromise = null;
      });
  }

  if (redisConnectPromise) {
    return redisConnectPromise;
  }

  return redisClient.isOpen ? redisClient : null;
};

const setOtpRecord = async (key, record, ttlMs) => {
  const safeTtlMs = Math.max(1000, Number(ttlMs) || 0);
  const payload = JSON.stringify(record);
  const client = await ensureRedisClient();

  if (client) {
    await client.set(key, payload, { PX: safeTtlMs });
    return 'redis';
  }

  cleanupMemoryEntry(key);
  const expiresAt = Date.now() + safeTtlMs;
  memoryStore.set(key, {
    record,
    expiresAt,
  });

  const timer = setTimeout(() => {
    cleanupMemoryEntry(key);
  }, safeTtlMs);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  memoryTimers.set(key, timer);
  return 'memory';
};

const getOtpRecord = async (key) => {
  const client = await ensureRedisClient();

  if (client) {
    const payload = await client.get(key);
    return payload ? JSON.parse(payload) : null;
  }

  const entry = memoryStore.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    cleanupMemoryEntry(key);
    return null;
  }

  return entry.record;
};

const deleteOtpRecord = async (key) => {
  const client = await ensureRedisClient();

  if (client) {
    await client.del(key);
  }

  cleanupMemoryEntry(key);
};

module.exports = {
  setOtpRecord,
  getOtpRecord,
  deleteOtpRecord,
};
