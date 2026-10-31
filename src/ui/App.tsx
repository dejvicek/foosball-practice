import type { Repository } from '../storage/repository';
import { BottomNav } from './components/BottomNav';
import { PlayersPage } from './pages/PlayersPage';
import { TrainingPage } from './pages/TrainingPage';
import { TrainingsPage } from './pages/TrainingsPage';
import { useAppState } from './useAppState';
import { useHashRoute } from './useHashRoute';

export function App({ repo }: { repo: Repository }) {
  const store = useAppState(repo);
  const [route, navigate] = useHashRoute();

  let body: React.ReactNode;
  if (store.status === 'loading') body = <p className="note">Načítám…</p>;
  else if (store.status === 'error')
    body = (
      <div className="load-error">
        <p>Nepodařilo se načíst data.</p>
        <button type="button" onClick={store.reload}>
          Zkusit znovu
        </button>
      </div>
    );
  else if (route.page === 'players') body = <PlayersPage store={store} />;
  else if (route.page === 'trainings') body = <TrainingsPage store={store} navigate={navigate} />;
  else if (route.page === 'training') body = <TrainingPage key={route.id} store={store} id={route.id} navigate={navigate} />;
  else body = <p className="note">Připravuje se.</p>;

  return (
    <>
      {store.saveState === 'retrying' && (
        <div className="save-banner" role="status">
          Neuloženo – zkouším znovu
        </div>
      )}
      <main className="page">{body}</main>
      <BottomNav route={route} navigate={navigate} />
    </>
  );
}
