import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { config } from '../config';

const localBus = new EventEmitter();
localBus.setMaxListeners(200);

let useInMemoryBus = false;

function createDummyRedisClient() {
  return {
    on: (event: string, cb: any) => {
      if (event === 'message' || event === 'pmessage') {
        localBus.on(event, cb);
      }
    },
    publish: async (channel: string, message: string) => {
      localBus.emit('message', channel, message);
      localBus.emit('pmessage', 'market:*', channel, message);
      return 1;
    },
    subscribe: (channel: string, cb?: Function) => {
      if (cb) cb(null, 1);
    },
    psubscribe: (pattern: string, cb?: Function) => {
      if (cb) cb(null, 1);
    },
  } as any;
}

const dummy = createDummyRedisClient();

let rawClient: any = null;
let rawPubClient: any = null;
let rawSubClient: any = null;

try {
  const redisOptions = config.redis.url
    ? config.redis.url
    : {
        host: config.redis.host,
        port: config.redis.port,
        retryStrategy: () => null,
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
      };

  rawClient = new Redis(redisOptions as any);
  rawPubClient = new Redis(redisOptions as any);
  rawSubClient = new Redis(redisOptions as any);

  const handleError = () => {
    if (!useInMemoryBus) {
      console.log('Redis connection unavailable. Seamlessly switching to In-Memory Pub/Sub EventBus...');
      useInMemoryBus = true;
    }
  };

  rawClient.on('error', handleError);
  rawPubClient.on('error', handleError);
  rawSubClient.on('error', handleError);
} catch (err) {
  useInMemoryBus = true;
}

export const redis = {
  on: (event: string, cb: Function) => {
    if (useInMemoryBus || !rawClient) return dummy.on(event, cb);
    try {
      rawClient.on(event, cb);
    } catch {
      dummy.on(event, cb);
    }
  },
};

export const redisPub = {
  publish: async (channel: string, message: string): Promise<number> => {
    if (useInMemoryBus || !rawPubClient) {
      return dummy.publish(channel, message);
    }
    try {
      return await rawPubClient.publish(channel, message);
    } catch {
      useInMemoryBus = true;
      return dummy.publish(channel, message);
    }
  },
};

export const redisSub = {
  subscribe: (channel: string, cb?: Function) => {
    if (useInMemoryBus || !rawSubClient) {
      return dummy.subscribe(channel, cb);
    }
    try {
      rawSubClient.subscribe(channel, (err: any, count: number) => {
        if (err) {
          useInMemoryBus = true;
          return dummy.subscribe(channel, cb);
        }
        if (cb) cb(err, count);
      });
    } catch {
      useInMemoryBus = true;
      dummy.subscribe(channel, cb);
    }
  },
  psubscribe: (pattern: string, cb?: Function) => {
    if (useInMemoryBus || !rawSubClient) {
      return dummy.psubscribe(pattern, cb);
    }
    try {
      rawSubClient.psubscribe(pattern, (err: any, count: number) => {
        if (err) {
          useInMemoryBus = true;
          return dummy.psubscribe(pattern, cb);
        }
        if (cb) cb(err, count);
      });
    } catch {
      useInMemoryBus = true;
      dummy.psubscribe(pattern, cb);
    }
  },
  on: (event: string, cb: Function) => {
    if (useInMemoryBus || !rawSubClient) return dummy.on(event, cb);
    try {
      rawSubClient.on(event, cb);
    } catch {
      dummy.on(event, cb);
    }
  },
};

// Hot state storage for latest tick per symbol (Redis is hot state only: last_tick:<SYMBOL>)
const hotTicksCache: Map<string, { tick: any; expiresAt: number }> = new Map();
const HOT_TICK_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export const redisHotState = {
  setLastTick: async (symbol: string, tick: any): Promise<void> => {
    const cleanSym = symbol.trim().toUpperCase();
    const payload = JSON.stringify(tick);

    // Always update hot cache
    hotTicksCache.set(cleanSym, {
      tick,
      expiresAt: Date.now() + HOT_TICK_TTL_SECONDS * 1000,
    });

    if (!useInMemoryBus && rawClient) {
      try {
        await rawClient.set(`last_tick:${cleanSym}`, payload, 'EX', HOT_TICK_TTL_SECONDS);
      } catch (err) {
        // Fall back gracefully to in-memory hot cache
      }
    }
  },

  getLastTick: async (symbol: string): Promise<any | null> => {
    const cleanSym = symbol.trim().toUpperCase();
    if (!useInMemoryBus && rawClient) {
      try {
        const raw = await rawClient.get(`last_tick:${cleanSym}`);
        if (raw) return JSON.parse(raw);
      } catch (err) {
        // Fall back to in-memory hot cache
      }
    }
    const cached = hotTicksCache.get(cleanSym);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.tick;
    }
    return null;
  },

  getLastTicks: async (symbols: string[]): Promise<Record<string, any>> => {
    const result: Record<string, any> = {};
    if (symbols.length === 0) return result;

    const cleanSymbols = symbols.map((s) => s.trim().toUpperCase());

    if (!useInMemoryBus && rawClient) {
      try {
        const keys = cleanSymbols.map((s) => `last_tick:${s}`);
        const values: (string | null)[] = await rawClient.mget(...keys);
        values.forEach((v, idx) => {
          if (v) {
            try {
              result[cleanSymbols[idx]] = JSON.parse(v);
            } catch (e) { }
          }
        });
        if (Object.keys(result).length > 0) return result;
      } catch (err) {
        // Fall back to in-memory hot cache
      }
    }

    // In-memory hot cache lookup
    for (const sym of cleanSymbols) {
      const cached = hotTicksCache.get(sym);
      if (cached && cached.expiresAt > Date.now()) {
        result[sym] = cached.tick;
      }
    }
    return result;
  },
};

