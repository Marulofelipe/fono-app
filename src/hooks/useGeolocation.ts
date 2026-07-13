import { useCallback, useEffect, useRef, useState } from 'react';

interface GeolocationState {
  position: GeolocationPosition | null;
  error: GeolocationPositionError | null;
  watching: boolean;
}

export function useGeolocation(onPositionUpdate?: (position: GeolocationPosition) => void) {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    watching: false,
  });

  const watchIdRef = useRef<number | null>(null);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation || watchIdRef.current !== null) return;

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setState({ position, error: null, watching: true });
        onPositionUpdate?.(position);
      },
      (error) => {
        setState({ position: null, error, watching: false });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      }
    );

    watchIdRef.current = id;
  }, [onPositionUpdate]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState((current) => ({ ...current, watching: false }));
  }, []);

  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  return {
    ...state,
    startWatching,
    stopWatching,
  };
}
