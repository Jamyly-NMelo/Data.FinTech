import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, post } from '@/services/api';
import { firstOf } from '@/lib/data';

const STORAGE_KEY = 'datafin.preferences';

export const DEFAULT_PREFERENCES = {
  theme: 'system',
  privacy_mode: false,
  active_environment: 'pf',
  currency: 'BRL',
  agenda_days: 10,
  projection_months: 12,
};

const PERSISTED_FIELDS = ['theme', 'privacy_mode', 'active_environment', 'currency', 'agenda_days', 'projection_months'];

const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

const writeCache = (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* sem armazenamento local disponível */
  }
};

const pick = (record) => {
  const next = {};
  PERSISTED_FIELDS.forEach((field) => {
    if (record?.[field] !== undefined && record[field] !== null) next[field] = record[field];
  });
  return next;
};

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(() => ({ ...DEFAULT_PREFERENCES, ...readCache() }));
  const [recordId, setRecordId] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const records = await get('records.list', {
          entity: 'Preferences',
          query: {},
          sort: '-updated_date',
          limit: 1,
        });
        const record = firstOf(records);
        if (!active) return;
        if (record) {
          setRecordId(record.id);
          setPreferences((current) => ({ ...current, ...pick(record) }));
        } else {
          const created = await post('records.create', { entity: 'Preferences', values: DEFAULT_PREFERENCES });
          if (active && created?.id) setRecordId(created.id);
        }
      } catch {
        /* visitante ainda não autenticado: seguimos com o cache local */
      } finally {
        if (active) setReady(true);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(
    async (patch) => {
      try {
        if (recordId) {
          await post('records.update', { entity: 'Preferences', id: recordId, values: patch });
        } else {
          const created = await post('records.create', {
            entity: 'Preferences',
            values: { ...DEFAULT_PREFERENCES, ...patch },
          });
          if (created?.id) setRecordId(created.id);
        }
      } catch {
        /* preferência local continua válida mesmo sem persistir */
      }
    },
    [recordId],
  );

  const update = useCallback(
    (patch) => {
      setPreferences((current) => {
        const next = { ...current, ...patch };
        writeCache(next);
        return next;
      });
      persist(patch);
    },
    [persist],
  );

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = preferences.theme === 'dark' || (preferences.theme === 'system' && prefersDark);
      root.classList.toggle('dark', isDark);
      root.style.colorScheme = isDark ? 'dark' : 'light';
    };
    apply();
    if (preferences.theme !== 'system') return undefined;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preferences.theme]);

  const value = useMemo(
    () => ({
      preferences,
      ready,
      update,
      environment: preferences.active_environment || 'pf',
      setEnvironment: (next) => update({ active_environment: next }),
      privacy: Boolean(preferences.privacy_mode),
      togglePrivacy: () => update({ privacy_mode: !preferences.privacy_mode }),
      theme: preferences.theme,
      setTheme: (next) => update({ theme: next }),
      currency: preferences.currency || 'BRL',
    }),
    [preferences, ready, update],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences precisa estar dentro de PreferencesProvider.');
  return context;
};

export const useEnvironment = () => {
  const { environment, setEnvironment } = usePreferences();
  return { environment, setEnvironment };
};