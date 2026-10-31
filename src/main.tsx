import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { memoryRepository } from './storage/memoryRepository';
import { supabaseRepository } from './storage/supabaseRepository';
import type { Repository } from './storage/repository';
import './ui/styles.css';

function createRepo(): Repository | null {
  const env = import.meta.env;
  if (env.VITE_USE_MEMORY === '1') return memoryRepository();
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) return null;
  return supabaseRepository(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
}

const repo = createRepo();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {repo ? (
      <App repo={repo} />
    ) : (
      <main className="page">
        <p>Chybí nastavení Supabase. Doplň .env.local podle .env.example.</p>
      </main>
    )}
  </StrictMode>,
);
