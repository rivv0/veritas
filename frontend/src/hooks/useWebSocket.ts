'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { WsTick, WsSignal, WsMarketState } from '@/lib/types';
import { useWatchlistStore } from '@/store/watchlistStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getDeviceId, fetchCatchupTicks } from '@/lib/api';

interface WebSocketHookResult {
  ticks: Record<string, WsTick>;
  signals: WsSignal[];
  connected: boolean;
  stale: boolean;
  marketState: WsMarketState | null;
  lastTickId: number;
}

export function useWebSocket(symbols: string[]): WebSocketHookResult {
  const ws = useRef<WebSocket | null>(null);
  const sseSource = useRef<EventSource | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [ticks, setTicks] = useState<Record<string, WsTick>>({});
  const [signals, setSignals] = useState<WsSignal[]>([]);
  const [connected, setConnected] = useState(false);
  const [stale, setStale] = useState(false);
  const [marketState, setMarketState] = useState<WsMarketState | null>(null);
  const [lastTickId, setLastTickId] = useState<number>(0);

  const symbolsRef = useRef<string[]>(symbols);
  symbolsRef.current = symbols;

  const accessTokenRef = useRef<string | null>(accessToken);
  accessTokenRef.current = accessToken;

  const lastSeenTickIdRef = useRef<number>(0);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const staleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isExplicitCloseRef = useRef<boolean>(false);

  // Store actions (stable references from Zustand)
  const setActiveSymbolsInStore = useWatchlistStore((s) => s.setActiveSymbols);
  const setTicksInStore = useWatchlistStore((s) => s.setTicks);
  const setTickInStore = useWatchlistStore((s) => s.setTick);
  const addSignalInStore = useWatchlistStore((s) => s.addSignal);

  const symbolsKey = symbols.slice().sort().join(',');

  useEffect(() => {
    setActiveSymbolsInStore(symbols);
  }, [symbolsKey, setActiveSymbolsInStore]);

  const processTick = useCallback(
    (tick: WsTick) => {
      if (tick.tickId !== undefined && tick.tickId > 0) {
        if (tick.tickId <= lastSeenTickIdRef.current) {
          return;
        }
        lastSeenTickIdRef.current = tick.tickId;
        setLastTickId(tick.tickId);
      }

      setTicks((prev) => ({ ...prev, [tick.symbol]: tick }));
      setTickInStore(tick);
    },
    [setTickInStore]
  );

  const processSignal = useCallback(
    (sig: WsSignal) => {
      setSignals((prev) => [sig, ...prev.filter((s) => s.id !== sig.id)].slice(0, 60));
      addSignalInStore(sig);
    },
    [addSignalInStore]
  );

  const performCatchup = useCallback(
    async (targetSymbols: string[]) => {
      if (lastSeenTickIdRef.current <= 0 || targetSymbols.length === 0) return;

      try {
        const res = await fetchCatchupTicks(targetSymbols, lastSeenTickIdRef.current);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const newTicksMap: Record<string, WsTick> = {};
          res.data.forEach((t: WsTick) => {
            if (t.tickId !== undefined && t.tickId > lastSeenTickIdRef.current) {
              lastSeenTickIdRef.current = t.tickId;
            }
            newTicksMap[t.symbol] = t;
          });

          setLastTickId(lastSeenTickIdRef.current);
          setTicks((prev) => ({ ...prev, ...newTicksMap }));
          setTicksInStore(newTicksMap);
        }
      } catch (err) {
        console.warn('Catchup fetch failed:', err);
      }
    },
    [setTicksInStore]
  );

  const processTickRef = useRef(processTick);
  processTickRef.current = processTick;

  const processSignalRef = useRef(processSignal);
  processSignalRef.current = processSignal;

  const performCatchupRef = useRef(performCatchup);
  performCatchupRef.current = performCatchup;

  // Fallback to SSE when market is closed or WS repeatedly disconnects
  const connectSSE = useCallback(() => {
    if (typeof window === 'undefined' || isExplicitCloseRef.current) return;
    if (sseSource.current) {
      sseSource.current.close();
    }

    const currentSyms = symbolsRef.current;
    const apiUrl =
      typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')
        ? 'https://veritas-backend-6epf.onrender.com'
        : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const sseUrl = `${apiUrl}/api/v1/market/stream-sse?symbols=${encodeURIComponent(currentSyms.join(','))}`;

    try {
      const source = new EventSource(sseUrl);

      source.onopen = () => {
        setConnected(true);
        if (staleTimerRef.current) {
          clearTimeout(staleTimerRef.current);
          staleTimerRef.current = null;
        }
        setStale(false);
      };

      source.addEventListener('tick', (e: MessageEvent) => {
        try {
          const tickData = JSON.parse(e.data);
          processTickRef.current(tickData);
        } catch (err) {
          console.error('SSE tick parse error:', err);
        }
      });

      source.addEventListener('signal', (e: MessageEvent) => {
        try {
          const sigData = JSON.parse(e.data);
          processSignalRef.current(sigData);
        } catch (err) {
          console.error('SSE signal parse error:', err);
        }
      });

      source.addEventListener('market_state', (e: MessageEvent) => {
        try {
          const stateData = JSON.parse(e.data);
          setMarketState(stateData);
        } catch (err) {}
      });

      source.onerror = () => {
        if (!staleTimerRef.current && !isExplicitCloseRef.current) {
          staleTimerRef.current = setTimeout(() => {
            setStale(true);
          }, 10000);
        }
        source.close();
      };

      sseSource.current = source;
    } catch (e) {
      console.warn('SSE fallback failed to initialize:', e);
    }
  }, []);

  const connect = useCallback(() => {
    if (isExplicitCloseRef.current) return;

    // Avoid duplicate connection attempts if already open or connecting
    if (
      ws.current &&
      (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    let wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl || wsUrl.includes('veritas-backend.onrender.com')) {
      if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
        wsUrl = 'wss://veritas-backend-6epf.onrender.com/ws/v1/market';
      } else {
        wsUrl = wsUrl || 'ws://localhost:4000/ws/v1/market';
      }
    }

    const currentToken = accessTokenRef.current;
    if (currentToken) {
      const sep = wsUrl.includes('?') ? '&' : '?';
      wsUrl = `${wsUrl}${sep}token=${encodeURIComponent(currentToken)}`;
    }

    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setConnected(true);
        if (staleTimerRef.current) {
          clearTimeout(staleTimerRef.current);
          staleTimerRef.current = null;
        }
        setStale(false);
        reconnectAttemptsRef.current = 0;

        // 1. Authenticate with token or deviceId
        if (accessTokenRef.current) {
          socket.send(JSON.stringify({ action: 'auth', token: accessTokenRef.current }));
        } else {
          const userId = getDeviceId();
          socket.send(JSON.stringify({ action: 'auth', userId }));
        }

        // 2. Subscribe to current watchlist symbols
        const currentSyms = symbolsRef.current;
        if (currentSyms.length > 0) {
          socket.send(JSON.stringify({ action: 'subscribe', symbols: currentSyms }));
        }

        // 3. Reconcile catch-up ticks
        performCatchupRef.current(currentSyms);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'snapshot' && data.ticks) {
            const snapshotTicks: Record<string, WsTick> = data.ticks;
            setTicks((prev) => ({ ...prev, ...snapshotTicks }));
            setTicksInStore(snapshotTicks);
          } else if (data.type === 'tick') {
            processTickRef.current(data);
          } else if (data.type === 'signal') {
            processSignalRef.current(data);
          } else if (data.type === 'market_state') {
            setMarketState(data);
          }
        } catch (err) {
          console.error('WebSocket parse error:', err);
        }
      };

      socket.onclose = () => {
        setConnected(false);

        // If closed cleanly on unmount, do not reconnect
        if (isExplicitCloseRef.current) return;

        // Only mark stale if disconnected for more than 10 seconds
        if (!staleTimerRef.current) {
          staleTimerRef.current = setTimeout(() => {
            if (!isExplicitCloseRef.current) {
              setStale(true);
            }
          }, 10000);
        }
        scheduleReconnect();
      };

      socket.onerror = () => {
        if (!staleTimerRef.current && !isExplicitCloseRef.current) {
          staleTimerRef.current = setTimeout(() => {
            if (!isExplicitCloseRef.current) {
              setStale(true);
            }
          }, 10000);
        }
      };

      ws.current = socket;
    } catch (err) {
      console.error('WebSocket connection attempt error:', err);
      scheduleReconnect();
    }
  }, [setTicksInStore]);

  const scheduleReconnect = useCallback(() => {
    if (isExplicitCloseRef.current) return;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    reconnectAttemptsRef.current += 1;
    const attempts = reconnectAttemptsRef.current;

    // Exponential backoff with ±20% jitter
    const baseDelay = Math.min(1000 * Math.pow(1.5, attempts), 15000);
    const jitter = baseDelay * (0.8 + Math.random() * 0.4);

    if (attempts >= 4 && !sseSource.current) {
      connectSSE();
    }

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, jitter);
  }, [connect, connectSSE]);

  // Connect ONCE on mount and disconnect ONCE on unmount
  useEffect(() => {
    isExplicitCloseRef.current = false;
    connect();

    return () => {
      isExplicitCloseRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      if (sseSource.current) {
        sseSource.current.close();
        sseSource.current = null;
      }
    };
  }, [connect]);

  // Dynamically update subscriptions over existing open WebSocket without disconnecting
  useEffect(() => {
    if (ws.current?.readyState === WebSocket.OPEN && symbols.length > 0) {
      ws.current.send(JSON.stringify({ action: 'subscribe', symbols }));
    }
  }, [symbolsKey]);

  // Dynamically update authentication over existing open WebSocket without disconnecting
  useEffect(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      if (accessToken) {
        ws.current.send(JSON.stringify({ action: 'auth', token: accessToken }));
      } else {
        ws.current.send(JSON.stringify({ action: 'auth', userId: getDeviceId() }));
      }
    }
  }, [accessToken]);

  return {
    ticks,
    signals,
    connected,
    stale,
    marketState,
    lastTickId,
  };
}
