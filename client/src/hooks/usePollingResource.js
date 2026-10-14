import { useCallback, useEffect, useRef, useState } from 'react';

export function usePollingResource(loader, intervalMs = 15000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasData = useRef(false);

  useEffect(() => {
    let active = true;
    let timeoutId;
    let controller;

    async function poll() {
      controller?.abort();
      controller = new AbortController();
      if (hasData.current) setIsRefreshing(true);
      else setIsLoading(true);

      try {
        const result = await loader(controller.signal);
        if (!active) return;
        setData(result);
        hasData.current = true;
        setError('');
        setLastUpdated(new Date());
      } catch (requestError) {
        if (active && requestError.name !== 'AbortError') setError(requestError.message);
      } finally {
        if (active) {
          setIsLoading(false);
          setIsRefreshing(false);
          timeoutId = window.setTimeout(poll, intervalMs);
        }
      }
    }

    poll();
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller?.abort();
    };
  }, [intervalMs, loader, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  return { data, error, isLoading, isRefreshing, lastUpdated, refresh };
}
