import { useState } from 'react';
import { loadPrefs, savePrefs, type UiPrefs } from '../storage/prefs';
import type { Repository } from '../storage/repository';
import { MainNav } from './components/MainNav';
import { LadderPage } from './pages/LadderPage';
import { PlayerPage } from './pages/PlayerPage';
import { PlayersPage } from './pages/PlayersPage';
import { TrainingPage } from './pages/TrainingPage';
import { TrainingsPage } from './pages/TrainingsPage';
import { useAppState } from './useAppState';
import { useHashRoute } from './useHashRoute';

export function App({ repo }: { repo: Repository }) {
  const store = useAppState(repo);
  const [route, navigate] = useHashRoute();
  const [prefs, setPrefsState] = useState<UiPrefs>(loadPrefs);
  const setPrefs = (p: UiPrefs) => {
    setPrefsState(p);
    savePrefs(p);
  };

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
  else if (route.page === 'ladder') body = <LadderPage store={store} prefs={prefs} setPrefs={setPrefs} navigate={navigate} />;
  else body = <PlayerPage store={store} id={route.id} prefs={prefs} navigate={navigate} />;

  return (
    <>
      <MainNav route={route} navigate={navigate} />
      {store.saveState === 'retrying' && (
        <div className="save-banner" role="status">
          Neuloženo – zkouším znovu
        </div>
      )}
      {store.saveError && (
        <div className="save-banner" role="alert">
          {store.saveError}{' '}
          <button type="button" className="ghost banner-ok" onClick={store.dismissSaveError}>
            OK
          </button>
        </div>
      )}
      <main className="page">{body}</main>
    </>
  );
}
