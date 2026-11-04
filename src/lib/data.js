/** Camada de persistência: acesso ao banco desacoplado da interface. */

import api from '@/services/api';
import { ENTITY_SCHEMAS, buildBackupPayload, toInsertable } from '@/lib/finance/backup';

const CHUNK_SIZE = 100;

/** Ordem de gravação: coleções referenciadas primeiro. */
export const RESTORE_ORDER = [
  'Account',
  'Category',
  'Investment',
  'TaxScenario',
  'Debt',
  'CardInvoice',
  'Transaction',
  'Budget',
  'InvestmentOperation',
  'Goal',
  'Pricing',
];

const pageOf = (result) => {
  if (Array.isArray(result)) return { items: result, next_cursor: null, has_more: false };
  return { items: result?.items ?? [], next_cursor: result?.next_cursor ?? null, has_more: Boolean(result?.has_more) };
};

export const firstOf = (result) => pageOf(result).items[0] ?? null;

export async function fetchPage(entity, query = {}, { sort = '-created_date', limit = 50, cursor = null } = {}) {
  const options = { sort, limit };
  if (cursor) options.cursor = cursor;
  const result = await api.get('records.list', { entity, query, ...options });
  return pageOf(result);
}

export async function fetchAll(entity, query = {}, { sort = '-created_date', pageSize = 200, max = 3000 } = {}) {
  const items = [];
  let cursor = null;
  let pages = 0;
  do {
    const page = await fetchPage(entity, query, { sort, limit: pageSize, cursor });
    items.push(...page.items);
    cursor = page.has_more && page.next_cursor ? page.next_cursor : null;
    pages += 1;
  } while (cursor && items.length < max && pages < 40);
  return items;
}

export const countRecords = (entity, query = {}) => api.get('records.count', { entity, query });
export const createRecord = (entity, values) => api.post('records.create', { entity, values });
export const createRecords = (entity, values = []) => api.post('records.bulkCreate', { entity, values });
export const updateRecord = (entity, id, values) => api.post('records.update', { entity, id, values });
export const deleteRecord = (entity, id) => api.post('records.delete', { entity, id });
export const deleteRecords = (entity, ids = []) =>
  ids.length ? api.post('records.deleteMany', { entity, query: { id: { $in: ids } } }) : Promise.resolve(null);
export const deleteAllOf = (entity) => api.post('records.deleteMany', { entity, query: {} });

/** Conjunto de trabalho usado pelos indicadores e gráficos. */
export async function loadWorkspaceData() {
  const [accounts, categories, transactions, budgets, goals, debts, investments, operations, pricings, scenarios, invoices] =
    await Promise.all([
      fetchAll('Account'),
      fetchAll('Category'),
      fetchAll('Transaction', { status: { $ne: 'cancelled' } }, { sort: '-due_date' }),
      fetchAll('Budget'),
      fetchAll('Goal'),
      fetchAll('Debt'),
      fetchAll('Investment'),
      fetchAll('InvestmentOperation', {}, { sort: '-date' }),
      fetchAll('Pricing'),
      fetchAll('TaxScenario'),
      fetchAll('CardInvoice'),
    ]);

  return { accounts, categories, transactions, budgets, goals, debts, investments, operations, pricings, scenarios, invoices };
}

/** Tudo, inclusive cancelados — usado na exportação. */
export const exportWorkspaceData = async () => {
  const [
    Account,
    Category,
    Transaction,
    Budget,
    Goal,
    Debt,
    CardInvoice,
    Investment,
    InvestmentOperation,
    Pricing,
    TaxScenario,
  ] = await Promise.all([
    fetchAll('Account'),
    fetchAll('Category'),
    fetchAll('Transaction'),
    fetchAll('Budget'),
    fetchAll('Goal'),
    fetchAll('Debt'),
    fetchAll('CardInvoice'),
    fetchAll('Investment'),
    fetchAll('InvestmentOperation'),
    fetchAll('Pricing'),
    fetchAll('TaxScenario'),
  ]);
  return {
    Account,
    Category,
    Transaction,
    Budget,
    Goal,
    Debt,
    CardInvoice,
    Investment,
    InvestmentOperation,
    Pricing,
    TaxScenario,
  };
};

async function writeCollections(collections) {
  const idMap = new Map();

  for (const entity of RESTORE_ORDER) {
    const rows = Array.isArray(collections[entity]) ? collections[entity] : [];
    if (rows.length === 0) continue;
    const references = ENTITY_SCHEMAS[entity]?.references || {};

    const prepared = rows.map((row) => {
      const record = toInsertable(row);
      Object.entries(references).forEach(([field, target]) => {
        const source = row[field];
        if (!source) return;
        const mapped = idMap.get(`${target}:${source}`);
        if (mapped) record[field] = mapped;
        else delete record[field];
      });
      return record;
    });

    for (let index = 0; index < prepared.length; index += CHUNK_SIZE) {
      const chunk = prepared.slice(index, index + CHUNK_SIZE);
      const created = await api.post('records.bulkCreate', { entity, values: chunk });
      const createdList = Array.isArray(created) ? created : created?.items || [];
      createdList.forEach((record, offset) => {
        const source = rows[index + offset]?.__source_id || rows[index + offset]?.id;
        if (source && record?.id) idMap.set(`${entity}:${source}`, record.id);
      });
    }
  }

  return idMap;
}

/**
 * Substitui os dados do usuário pelos do arquivo validado.
 * Uma cópia de segurança é guardada antes; se algo falhar, ela é reaplicada.
 */
export const replaceWorkspaceData = async (validatedData, { onProgress } = {}) => {
  onProgress?.('Preparando cópia de segurança');
  const snapshot = buildBackupPayload(await exportWorkspaceData()).data;

  try {
    for (const entity of RESTORE_ORDER) {
      onProgress?.(`Limpando ${entity}`);
      await deleteAllOf(entity);
    }
    onProgress?.('Gravando novos registros');
    await writeCollections(validatedData);
    return { ok: true };
  } catch (error) {
    try {
      for (const entity of RESTORE_ORDER) await deleteAllOf(entity);
      await writeCollections(snapshot);
    } catch (rollbackError) {
      const rollbackMessage = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
      throw new Error(`A importação falhou (${error.message}) e a restauração automática também não foi concluída (${rollbackMessage}).`);
    }
    throw new Error(`A importação falhou e os dados anteriores foram restaurados automaticamente. Detalhe: ${error.message}`);
  }
};