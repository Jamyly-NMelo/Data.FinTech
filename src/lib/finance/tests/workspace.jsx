import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createRecord, createRecords, deleteRecord, loadWorkspaceData, updateRecord } from '@/lib/data';

const WorkspaceContext = createContext(null);

const EMPTY = {
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  goals: [],
  debts: [],
  investments: [],
  operations: [],
  pricings: [],
  scenarios: [],
  invoices: [],
};

export function WorkspaceProvider({ children }) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [initialised, setInitialised] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadWorkspaceData();
      setData(next);
      setError(null);
      setInitialised(true);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (entity, values) => {
      const created = await createRecord(entity, values);
      await refresh();
      return created;
    },
    [refresh],
  );

  const createMany = useCallback(
    async (entity, values = []) => {
      if (!values.length) return [];
      const created = await createRecords(entity, values);
      await refresh();
      return created;
    },
    [refresh],
  );

  const update = useCallback(
    async (entity, id, values) => {
      const updated = await updateRecord(entity, id, values);
      await refresh();
      return updated;
    },
    [refresh],
  );

  const remove = useCallback(
    async (entity, id) => {
      await deleteRecord(entity, id);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ ...data, data, loading, initialised, error, refresh, create, createMany, update, remove }),
    [data, loading, initialised, error, refresh, create, createMany, update, remove],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace precisa estar dentro de WorkspaceProvider.');
  return context;
};