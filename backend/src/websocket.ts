import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { redisSub, redisHotState } from './db/redis';
import { authService } from './services/authService';
import { UserPublicProfile } from './domain/types';

interface ClientConnection {
  ws: WebSocket;
  subscriptions: Set<string>;
  userId?: string;
  user?: UserPublicProfile;
}

interface BufferedTick {
  tick: any;
  receivedAt: number;
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<ClientConnection> = new Set();
  private isRedisSubscribed = false;

  // 5-second in-process circular ring buffer to absorb reconnect bursts without querying DB
  private ringBuffer: Map<string, BufferedTick[]> = new Map();
  private ringBufferTtlMs = 5000;

  init(server: Server) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', async (request, socket, head) => {
      try {
        const host = request.headers.host || 'localhost';
        const url = new URL(request.url || '', `http://${host}`);

        if (url.pathname !== '/ws/v1/market') {
          return;
        }

        const token = url.searchParams.get('token');
        let authUser: UserPublicProfile | undefined = undefined;

        if (token) {
          try {
            authUser = await authService.verifyAccessToken(token);
          } catch (err: any) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }
        }

        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          this.wss!.emit('connection', ws, request, authUser);
        });
      } catch (err) {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: WebSocket, _request: any, authUser?: UserPublicProfile) => {
      const client: ClientConnection = {
        ws,
        subscriptions: new Set(),
        userId: authUser?.id,
        user: authUser,
      };
      this.clients.add(client);
      console.log('WebSocket client connected. Total clients:', this.clients.size, authUser ? `(User: ${authUser.email})` : '(Guest)');

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message);

          if (data.action === 'auth') {
            if (data.token) {
              try {
                const user = await authService.verifyAccessToken(data.token);
                client.userId = user.id;
                client.user = user;
                ws.send(JSON.stringify({ type: 'authenticated', user }));
              } catch (err: any) {
                ws.send(JSON.stringify({ type: 'auth_error', message: err.message }));
              }
            } else if (data.userId) {
              client.userId = data.userId;
            }
          }

          if (data.action === 'subscribe' && Array.isArray(data.symbols)) {
            data.symbols.forEach((sym: string) => client.subscriptions.add(sym.toUpperCase()));

            // 1. Snapshot-on-Connect: immediately send latest hot tick from Redis
            try {
              const hotSnapshots = await redisHotState.getLastTicks(data.symbols);
              if (Object.keys(hotSnapshots).length > 0) {
                ws.send(
                  JSON.stringify({
                    type: 'snapshot',
                    ticks: hotSnapshots,
                    timestamp: new Date().toISOString(),
                  })
                );
              }
            } catch (err) {
              console.warn('Error sending initial snapshot:', err);
            }

            // 2. Replay client's full subscription state from the store
            ws.send(
              JSON.stringify({
                type: 'subscribed',
                symbols: Array.from(client.subscriptions),
              })
            );
          } else if (data.action === 'unsubscribe' && Array.isArray(data.symbols)) {
            data.symbols.forEach((sym: string) => client.subscriptions.delete(sym.toUpperCase()));
            ws.send(
              JSON.stringify({
                type: 'unsubscribed',
                symbols: Array.from(client.subscriptions),
              })
            );
          }
        } catch (err) {
          console.error('WS message parse error:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(client);
        console.log('WebSocket client disconnected. Remaining:', this.clients.size);
      });

      ws.on('error', (err) => console.error('WebSocket client error:', err));
    });

    // Wire Redis Pub/Sub pattern subscriber for real-time tick, signal & alert forwarding
    this.setupRedisSubscriber();
  }

  /**
   * Records a tick into the server-side 5s in-process ring buffer
   */
  recordTick(symbol: string, tick: any) {
    const cleanSym = symbol.trim().toUpperCase();
    const now = Date.now();
    let buffer = this.ringBuffer.get(cleanSym) || [];

    // Purge items older than 5s
    buffer = buffer.filter((item) => now - item.receivedAt <= this.ringBufferTtlMs);
    buffer.push({ tick, receivedAt: now });
    this.ringBuffer.set(cleanSym, buffer);
  }

  /**
   * Retrieves recent buffered ticks from in-memory ring buffer (absorbs reconnect bursts)
   */
  getRecentBufferedTicks(symbols: string[], sinceTs: number): any[] {
    const result: any[] = [];
    for (const sym of symbols) {
      const buffer = this.ringBuffer.get(sym.toUpperCase()) || [];
      buffer.forEach((item) => {
        if (item.receivedAt > sinceTs) {
          result.push(item.tick);
        }
      });
    }
    return result;
  }

  private setupRedisSubscriber() {
    if (this.isRedisSubscribed) return;

    try {
      if (typeof redisSub.psubscribe === 'function') {
        redisSub.psubscribe('market:*', (err: any) => {
          if (!err) {
            console.log('WebSocketManager subscribed to Redis Pub/Sub (market:*)');
            this.isRedisSubscribed = true;
          }
        });

        redisSub.on('pmessage', (_pattern: string, channel: string, message: string) => {
          try {
            const payload = JSON.parse(message);
            const channelParts = channel.split(':');
            const type = channelParts[1]; // 'ticks', 'signals', 'alerts'
            const target = channelParts[2]; // symbol or userId

            if (type === 'alerts') {
              // Direct alert event to user
              this.broadcastToUser(target, payload);
            } else if (target) {
              this.broadcastToSymbol(target, payload);
            }
          } catch (e) {
            console.error('Error forwarding Redis message to WS:', e);
          }
        });
      }
    } catch (e) {
      console.log('Redis subscriber setup skipped (in-memory event bus active)');
    }
  }

  broadcastToSymbol(symbol: string, payload: any) {
    const cleanSym = symbol.trim().toUpperCase();
    const jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const client of this.clients) {
      if (
        client.ws.readyState === WebSocket.OPEN &&
        (client.subscriptions.size === 0 || client.subscriptions.has(cleanSym))
      ) {
        client.ws.send(jsonStr);
      }
    }
  }

  broadcastToUser(userId: string, payload: any) {
    const jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN && client.userId === userId) {
        client.ws.send(jsonStr);
      }
    }
  }

  broadcastSystemEvent(payload: any) {
    const jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(jsonStr);
      }
    }
  }
}

export const wsManager = new WebSocketManager();
