import type { Route } from '../useHashRoute';

const ITEMS: { label: string; route: Route; match: Route['page'][] }[] = [
  { label: 'Trénink', route: { page: 'trainings' }, match: ['trainings', 'training'] },
  { label: 'Žebříček', route: { page: 'ladder' }, match: ['ladder', 'player'] },
  { label: 'Hráči', route: { page: 'players' }, match: ['players'] },
];

export function BottomNav({ route, navigate }: { route: Route; navigate: (r: Route) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Hlavní navigace">
      {ITEMS.map((it) => {
        const active = it.match.includes(route.page);
        return (
          <button
            key={it.label}
            type="button"
            className={active ? 'active' : undefined}
            aria-current={active ? 'page' : undefined}
            onClick={() => navigate(it.route)}
          >
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
