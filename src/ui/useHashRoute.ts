import { useCallback, useEffect, useState } from 'react';

export type Route =
  | { page: 'trainings' }
  | { page: 'training'; id: string }
  | { page: 'ladder' }
  | { page: 'player'; id: string }
  | { page: 'players' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'trenink' && parts[1]) return { page: 'training', id: parts[1] };
  if (parts[0] === 'zebricek' && parts[1] === 'hrac' && parts[2]) return { page: 'player', id: parts[2] };
  if (parts[0] === 'zebricek') return { page: 'ladder' };
  if (parts[0] === 'hraci') return { page: 'players' };
  return { page: 'trainings' };
}

export function toHash(r: Route): string {
  switch (r.page) {
    case 'trainings':
      return '#/trenink';
    case 'training':
      return `#/trenink/${encodeURIComponent(r.id)}`;
    case 'ladder':
      return '#/zebricek';
    case 'player':
      return `#/zebricek/hrac/${encodeURIComponent(r.id)}`;
    case 'players':
      return '#/hraci';
  }
}

export function useHashRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const navigate = useCallback((r: Route) => {
    const h = toHash(r);
    if (window.location.hash !== h) window.location.hash = h;
    setRoute(r);
    window.scrollTo?.(0, 0);
  }, []);
  return [route, navigate];
}
