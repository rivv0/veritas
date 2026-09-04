'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { WsTick, WsSignal } from '@/lib/types';

export function useWebSocket(symbols: string[]) {
  const ws = useRef<WebSocket | null>(null);
  const [ticks, setTicks] = useState<Record<string, WsTick>>({});
  const [signals, setSignals] = useState<WsSignal[]>([]);
  const [connected, setConnected] = useState(false);
  const [stale, setStale] = useState(false);

  const connect = useCallback(() => {
    let wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl || wsUrl.includes('veritas-backend.onrender.com')) {
      if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
        wsUrl = 'wss://veritas-backend-6epf.onrender.com/ws/v1/market';
      } else {
        wsUrl = wsUrl || 'ws://localhost:4000/ws/v1/market';
      }
    }
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setConnected(true);
      setStale(false);
      if (symbols.length > 0) {
        socket.send(JSON.stringify({ action: 'subscribe', symbols }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'tick') {
          setTicks((prev) => ({ ...prev, [data.symbol]: data }));
        } else if (data.type === 'signal') {
          setSignals((prev) => [data, ...prev].slice(0, 50));
        }
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };

    socket.onclose = () => {
      setConnected(false);
      setStale(true);
    };

    socket.onerror = () => {
      setStale(true);
    };

    ws.current = socket;
  }, [symbols]);

  useEffect(() => {
    connect();
    const reconnectInterval = setInterval(() => {
      if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
        connect();
      }
    }, 5000);

    return () => {
      clearInterval(reconnectInterval);
      ws.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    if (ws.current?.readyState === WebSocket.OPEN && symbols.length > 0) {
      ws.current.send(JSON.stringify({ action: 'subscribe', symbols }));
    }
  }, [symbols]);

  return { ticks, signals, connected, stale };
}
