'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type TimerStatus = 'stopped' | 'running' | 'paused';

export function useGameTimer() {
  const [elapsed, setElapsed] = useState(0); // seconds
  const [status, setStatus] = useState<TimerStatus>('stopped');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  const tick = useCallback(() => {
    const now = Date.now();
    setElapsed(accumulatedRef.current + Math.floor((now - startTimeRef.current) / 1000));
  }, []);

  const start = useCallback(() => {
    if (status === 'running') return;
    startTimeRef.current = Date.now();
    setStatus('running');
    intervalRef.current = setInterval(tick, 500);
  }, [status, tick]);

  const pause = useCallback(() => {
    if (status !== 'running') return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    accumulatedRef.current = elapsed;
    setStatus('paused');
  }, [status, elapsed]);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    accumulatedRef.current = 0;
    setElapsed(0);
    setStatus('stopped');
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { elapsed, formatted, status, start, pause, reset };
}
