import { useEffect, useRef, useState } from 'react';
import { useLocalStorageState } from './useLocalStorage';

interface TherapyTimerOptions {
  key: string;
  defaultSeconds: number;
  onComplete?: () => void;
}

export function useTherapyTimer({ key, defaultSeconds, onComplete }: TherapyTimerOptions) {
  const [remainingSeconds, setRemainingSeconds] = useLocalStorageState<number>(key, defaultSeconds);
  const [active, setActive] = useLocalStorageState<boolean>(`${key}_active`, false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    if (remainingSeconds <= 0) {
      setActive(false);
      onComplete?.();
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [active, remainingSeconds, onComplete, setRemainingSeconds, setActive]);

  useEffect(() => {
    if (remainingSeconds <= 0 && active) {
      setActive(false);
      onComplete?.();
    }
  }, [remainingSeconds, active, onComplete, setActive]);

  const start = () => setActive(true);
  const pause = () => setActive(false);
  const reset = (seconds: number) => {
    setRemainingSeconds(seconds);
    setActive(false);
  };
  const addSeconds = (seconds: number) => {
    setRemainingSeconds((current) => Math.max(current + seconds, 0));
  };

  return {
    remainingSeconds,
    active,
    start,
    pause,
    reset,
    addSeconds,
  };
}
