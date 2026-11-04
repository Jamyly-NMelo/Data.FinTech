import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchPage } from '@/lib/data';

export function useCollection(entity, { query = {}, sort = '-created_date', limit = 50 } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const cursorRef = useRef(null);
  const queryKey = useMemo(() => JSON.stringify(query), [query]);
  const stableQuery = useMemo(() => JSON.parse(queryKey), [queryKey]);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;
    cursorRef.current = null;
    setItems([]);
    setLoading(true);
    setError(null);
    fetchPage(entity, stableQuery, { sort, limit })
      .then((page) => {
        if (!active) return;
        setItems(page.items);
        setHasMore(page.has_more);
        cursorRef.current = page.next_cursor;
      })
      .catch((loadError) => {
        if (active) setError(loadError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [entity, stableQuery, sort, limit, refreshKey]);

  const loadMore = useCallback(async () => {
    if (!cursorRef.current || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(entity, stableQuery, { sort, limit, cursor: cursorRef.current });
      setItems((current) => [...current, ...page.items]);
      setHasMore(page.has_more);
      cursorRef.current = page.next_cursor;
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoadingMore(false);
    }
  }, [entity, stableQuery, sort, limit, loadingMore]);

  return { items, loading, loadingMore, error, hasMore, loadMore, refresh };
}
