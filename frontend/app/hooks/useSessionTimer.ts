/**
 * React hook for session countdown timer.
 * Provides formatted time, warning states, and expiry detection.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSessionTimerReturn {
  timeRemaining: number; // seconds
  formattedTime: string; // "MM:SS"
  isLowTime: boolean; // < 60 seconds
  isExpired: boolean;
  start: (durationSec: number) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useSessionTimer(onExpire?: () => void): UseSessionTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onExpireRef = useRef(onExpire);

  // Keep callback ref up to date
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Timer tick
  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setIsRunning(false);
          onExpireRef.current?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, timeRemaining]);

  const start = useCallback((durationSec: number) => {
    setTimeRemaining(durationSec);
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    if (timeRemaining > 0) {
      setIsRunning(true);
    }
  }, [timeRemaining]);

  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeRemaining(0);
  }, []);

  const formattedTime = formatTime(timeRemaining);
  const isLowTime = timeRemaining > 0 && timeRemaining <= 60;
  const isExpired = timeRemaining <= 0 && !isRunning;

  return {
    timeRemaining,
    formattedTime,
    isLowTime,
    isExpired,
    start,
    pause,
    resume,
    reset,
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
