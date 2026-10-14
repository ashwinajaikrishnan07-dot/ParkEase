import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { addFavorite, listFavorites, removeFavorite } from '../services/favoriteService.js';

export const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { isAuthenticated, token } = useAuth();
  const [ids, setIds] = useState(() => new Set());
  const [destinations, setDestinations] = useState([]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const data = await listFavorites(token);
      setDestinations(data.destinations);
      setIds(new Set(data.destinations.map((d) => d._id)));
    } catch {
      // non-fatal; favorites simply stay empty
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) refresh();
    else { setIds(new Set()); setDestinations([]); }
  }, [isAuthenticated, refresh]);

  const toggle = useCallback(async (destinationId) => {
    const isFav = ids.has(destinationId);
    // optimistic
    setIds((current) => {
      const next = new Set(current);
      if (isFav) next.delete(destinationId); else next.add(destinationId);
      return next;
    });
    try {
      if (isFav) await removeFavorite(token, destinationId);
      else await addFavorite(token, destinationId);
      refresh();
    } catch {
      refresh();
    }
  }, [ids, token, refresh]);

  const value = useMemo(() => ({
    destinations,
    isFavorite: (id) => ids.has(id),
    toggle,
    refresh,
    count: ids.size,
  }), [destinations, ids, toggle, refresh]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}
