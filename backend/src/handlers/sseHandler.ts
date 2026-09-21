import { Request, Response } from 'express';
import { calendarService } from '../services/calendarService';

interface SseClient {
  id: string;
  res: Response;
}

export class SseHandler {
  private clients: Set<SseClient> = new Set();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.heartbeatTimer = setInterval(() => {
      this.broadcastEvent('heartbeat', { timestamp: new Date().toISOString() });
    }, 25000);
  }

  handleSseConnection(req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const client: SseClient = { id: clientId, res };
    this.clients.add(client);

    // Initial state
    const session = calendarService.getMarketSession('GROWW');
    this.sendEvent(client, 'market_state', {
      isOpen: session.isOpen,
      sessionState: session.sessionState,
      nextOpen: session.nextOpen.toISOString(),
      minutesToOpen: session.minutesToOpen,
    });

    req.on('close', () => {
      this.clients.delete(client);
    });
  }

  private sendEvent(client: SseClient, event: string, data: any) {
    try {
      const id = Date.now();
      client.res.write(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (e) {
      this.clients.delete(client);
    }
  }

  broadcastEvent(event: string, data: any) {
    const deadClients: SseClient[] = [];
    for (const client of this.clients) {
      try {
        const id = Date.now();
        client.res.write(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch (e) {
        deadClients.push(client);
      }
    }
    deadClients.forEach((c) => this.clients.delete(c));
  }
}

export const sseHandler = new SseHandler();
