import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { config } from '../config';

const localBus = new EventEmitter();

let useInMemoryBus = false;

function createDummyRedisClient() {
  return {
    on: (event: string, cb: Function) => {},
    publish: async (channel: string, message: string) => {
      localBus.emit(channel, message);
      return 1;
    },
    subscribe: (channel: string, cb?: Function) => {
      if (cb) cb(null, 1);
    },
  } as any;
}

let redisClient: any;
let redisPubClient: any;
let redisSubClient: any;

try {
  redisClient = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    retryStrategy: () => null, // Don't crash or retry endlessly if Redis is down
    lazyConnect: true,
  });

  redisPubClient = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    retryStrategy: () => null,
    lazyConnect: true,
  });

  redisSubClient = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    retryStrategy: () => null,
    lazyConnect: true,
  });

  redisClient.on('error', () => {
    if (!useInMemoryBus) {
      console.log('Redis unavailable. Seamlessly switching to In-Memory Pub/Sub EventBus...');
      useInMemoryBus = true;
    }
  });
} catch (e) {
  useInMemoryBus = true;
}

export const redis = useInMemoryBus ? createDummyRedisClient() : redisClient;
export const redisPub = useInMemoryBus ? createDummyRedisClient() : redisPubClient;
export const redisSub = useInMemoryBus ? createDummyRedisClient() : redisSubClient;
