import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { redisSub } from './db/redis';

interface ClientConnection {
  ws: WebSocket;
  subscriptions: Set<string>;
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<ClientConnection> = new Set();
  private isRedisSubscribed = false;

  init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/v1/market' });

    this.wss.on('connection', (ws: WebSocket) => {
      const client: ClientConnection = { ws, subscriptions: new Set() };
      this.clients.add(client);
      console.log('WebSocket client connected. Total clients:', this.clients.size);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          if (data.action === 'subscribe' && Array.isArray(data.symbols)) {
            data.symbols.forEach((sym: string) => client.subscriptions.add(sym));
            ws.send(JSON.stringify({ type: 'subscribed', symbols: Array.from(client.subscriptions) }));
          } else if (data.action === 'unsubscribe' && Array.isArray(data.symbols)) {
            data.symbols.forEach((sym: string) => client.subscriptions.delete(sym));
            ws.send(JSON.stringify({ type: 'unsubscribed', symbols: Array.from(client.subscriptions) }));
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

    // Wire Redis Pub/Sub pattern subscriber for real-time tick & signal forwarding
    this.setupRedisSubscriber();
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
            const symbol = payload.symbol || channel.split(':').pop();
            if (symbol) {
              this.broadcastToSymbol(symbol, payload);
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
    const jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const client of this.clients) {
      if (
        client.ws.readyState === WebSocket.OPEN &&
        (client.subscriptions.size === 0 || client.subscriptions.has(symbol))
      ) {
        client.ws.send(jsonStr);
      }
    }
  }
}

export const wsManager = new WebSocketManager();
