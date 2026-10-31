/**
 * Backup em JSON: montagem, validação integral e normalização.
 * Módulo puro — não toca no banco. A validação roda antes de qualquer
 * alteração, de modo que uma importação inválida nunca destrói a base atual.
 */

import { round2, toNumber } from './money.js';
import { KIND, isCancelled, isTransfer } from './ledger.js';
import { monthKey } from './periods.js';

export const FORMAT_VERSION = 1;
export const APP_ID = 'data-fintech';

const STRING = 'string';
const NUMBER = 'number';
const BOOLEAN = 'boolean';
const DATE = 'date';

export const ENTITY_SCHEMAS = {
  Account: {
    fields: {
      name: STRING, institution: STRING, type: STRING, environment: STRING, opening_balance: NUMBER,
      credit_limit: NUMBER, closing_day: NUMBER, due_day: NUMBER, currency: STRING, archived: BOOLEAN, notes: STRING,
    },
    required: ['name', 'type'],
    enums: {
      type: ['checking', 'savings', 'cash', 'credit_card', 'investment'],
      environment: ['pf', 'pj', 'invest'],
    },
  },
  Category: {
    fields: { name: STRING, kind: STRING, group: STRING, environment: STRING, color: STRING },
    required: ['name', 'kind'],
    enums: {
      kind: ['income', 'expense'],
      group: ['receita', 'custos', 'operacional', 'financeiro', 'prolabore', 'pessoal', 'impostos', 'patrimonio', 'nao_classificado'],
      environment: ['pf', 'pj', 'invest'],
    },
  },
  Transaction: {
    fields: {
      description: STRING, kind: STRING, amount: NUMBER, environment: STRING, account_id: STRING,
      counterpart_account_id: STRING, card_invoice_account_id: STRING, debt_id: STRING, category_id: STRING,
      competence_date: DATE, due_date: DATE,
      settlement_date: DATE, status: STRING, settled_amount: NUMBER, notes: STRING,
    },
    required: ['description', 'kind', 'amount'],
    enums: {
      kind: ['income', 'expense', 'transfer'],
      status: ['pending', 'settled', 'cancelled'],
      environment: ['pf', 'pj', 'invest'],
    },
    references: {
      account_id: 'Account',
      counterpart_account_id: 'Account',
      card_invoice_account_id: 'Account',
      debt_id: 'Debt',
      category_id: 'Category',
    },
  },
  CardInvoice: {
    fields: {
      account_id: STRING, environment: STRING, institution: STRING, card_mask: STRING,
      closing_date: DATE, due_date: DATE, period_from: DATE, period_to: DATE,
      previous_balance: NUMBER, declared_total: NUMBER, minimum_payment: NUMBER,
      items_total: NUMBER, items_count: NUMBER, summary_only: BOOLEAN, fingerprint: STRING,
      source: STRING, source_file_name: STRING, source_file_uri: STRING, status: STRING, notes: STRING,
    },
    required: ['account_id'],
    enums: {
      environment: ['pf', 'pj', 'invest'],
      source: ['pdf_import', 'manual'],
      status: ['confirmado', 'descartado'],
    },
    references: { account_id: 'Account' },
  },
  Budget: {
    fields: { category_id: STRING, environment: STRING, month: STRING, amount: NUMBER, alert_percent: NUMBER, notes: STRING },
    required: ['category_id', 'month', 'amount'],
    enums: { environment: ['pf', 'pj', 'invest'] },
    references: { category_id: 'Category' },
  },
  Goal: {
    fields: {
      name: STRING, environment: STRING, target_amount: NUMBER, saved_amount: NUMBER, deadline: DATE,
      priority: STRING, status: STRING, notes: STRING,
    },
    required: ['name', 'target_amount'],
    enums: { environment: ['pf', 'pj', 'invest'], priority: ['baixa', 'media', 'alta'], status: ['ativa', 'concluida', 'pausada'] },
  },
  Debt: {
    fields: {
      name: STRING, creditor: STRING, environment: STRING, principal: NUMBER, outstanding_balance: NUMBER,
      annual_interest_rate: NUMBER, future_interest: NUMBER, installment_amount: NUMBER, installments_total: NUMBER,
      installments_paid: NUMBER, start_date: DATE, maturity_date: DATE, term: STRING, due_day: NUMBER, notes: STRING,
    },
    required: ['name', 'outstanding_balance'],
    enums: {
      environment: ['pf', 'pj', 'invest'],
      term: ['curto_prazo', 'longo_prazo', 'nao_classificado'],
    },
  },
  Investment: {
    fields: {
      name: STRING, ticker: STRING, asset_class: STRING, environment: STRING, institution: STRING,
      quantity: NUMBER, avg_price: NUMBER, current_price: NUMBER, quote_date: DATE, notes: STRING,
    },
    required: ['name'],
    enums: {
      asset_class: ['renda_fixa', 'acoes', 'fii', 'fundos', 'cripto', 'exterior', 'outros'],
      environment: ['pf', 'pj', 'invest'],
    },
  },
  InvestmentOperation: {
    fields: { investment_id: STRING, type: STRING, date: DATE, quantity: NUMBER, price: NUMBER, fees: NUMBER, notes: STRING },
    required: ['investment_id', 'type', 'date'],
    enums: { type: ['aporte', 'resgate', 'dividendo', 'jcp', 'rendimento'] },
    references: { investment_id: 'Investment' },
  },
  Pricing: {
    fields: {
      name: STRING, environment: STRING, unit_name: STRING, variable_cost: NUMBER, fixed_cost_monthly: NUMBER,
      tax_percent: NUMBER, commission_percent: NUMBER, desired_margin_percent: NUMBER, current_price: NUMBER,
      expected_monthly_units: NUMBER, notes: STRING,
    },
    required: ['name'],
    enums: { environment: ['pf', 'pj', 'invest'] },
  },
  TaxScenario: {
    fields: {
      name: STRING, activity: STRING, service_annex: STRING, monthly_revenue: NUMBER, annual_revenue: NUMBER,
      profit_margin_percent: NUMBER, payroll: NUMBER, iss_percent: NUMBER, mei_das: NUMBER, notes: STRING,
    },
    required: ['name'],
    enums: {
      activity: ['comercio', 'servicos', 'industria', 'misto'],
      service_annex: ['I', 'III', 'V'],
    },
  },
  Preferences: {
    fields: {
      theme: STRING, privacy_mode: BOOLEAN, active_environment: STRING, currency: STRING,
      agenda_days: NUMBER, projection_months: NUMBER,
    },
    required: [],
    enums: { theme: ['light', 'dark', 'system'], active_environment: ['pf', 'pj', 'invest', 'consolidado'] },
  },
};

export const BACKUP_ENTITIES = Object.keys(ENTITY_SCHEMAS);

const SYSTEM_FIELDS = ['id', 'created_by_id', 'created_by', 'created_date', 'updated_date'];
const EXPORT_ONLY_STRIPPED = ['created_by_id', 'created_by', 'created_date', 'updated_date'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Valida e normaliza um payload de backup. Nunca lança exceção. */
export const validateBackup = (payload) => {
  const errors = [];
  const warnings = [];
  const data = {};
  const preview = { counts: {}, totals: {}, samples: [], period: null };

  if (!isPlainObject(payload)) {
    return { ok: false, errors: ['O arquivo não contém um objeto JSON válido.'], warnings, data: null, preview: null };
  }

  const version = toNumber(payload.format_version);
  if (!payload.format_version) errors.push('Campo obrigatório ausente: format_version.');
  else if (version > FORMAT_VERSION) {
    errors.push(`Versão de formato ${version} é mais recente que a suportada (${FORMAT_VERSION}). Atualize a aplicação antes de importar.`);
  } else if (version < 1) {
    errors.push(`Versão de formato inválida: ${payload.format_version}.`);
  }

  if (payload.app && payload.app !== APP_ID) {
    errors.push(`O arquivo pertence a outro aplicativo ("${payload.app}").`);
  }

  if (!isPlainObject(payload.data)) {
    errors.push('Campo obrigatório ausente ou inválido: data.');
    return { ok: false, errors, warnings, data: null, preview: null };
  }

  Object.keys(payload.data).forEach((key) => {
    if (!ENTITY_SCHEMAS[key]) warnings.push(`Coleção desconhecida ignorada: ${key}.`);
  });

  const ids = new Map();
  Object.entries(ENTITY_SCHEMAS).forEach(([entity, schema]) => {
    const rows = payload.data[entity];
    if (rows === undefined) {
      data[entity] = [];
      return;
    }
    if (!Array.isArray(rows)) {
      errors.push(`A coleção ${entity} deve ser uma lista.`);
      return;
    }
    const normalized = [];
    rows.forEach((row, index) => {
      const label = `${entity}[${index}]`;
      if (!isPlainObject(row)) {
        errors.push(`${label}: registro não é um objeto.`);
        return;
      }
      const record = {};
      let rowInvalid = false;

      Object.entries(schema.fields).forEach(([field, type]) => {
        const value = row[field];
        if (value === undefined || value === null || value === '') return;
        if (type === NUMBER) {
          if (typeof value === 'number' && Number.isFinite(value)) record[field] = value;
          else if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value.replace(',', '.')))) {
            record[field] = Number(value.replace(',', '.'));
            warnings.push(`${label}.${field}: texto numérico convertido para número.`);
          } else {
            errors.push(`${label}.${field}: valor numérico inválido ("${value}").`);
            rowInvalid = true;
          }
        } else if (type === BOOLEAN) {
          if (typeof value === 'boolean') record[field] = value;
          else {
            errors.push(`${label}.${field}: valor booleano inválido.`);
            rowInvalid = true;
          }
        } else if (type === DATE) {
          const text = String(value).slice(0, 10);
          if (!DATE_PATTERN.test(text)) {
            errors.push(`${label}.${field}: data inválida ("${value}"). Use o formato AAAA-MM-DD.`);
            rowInvalid = true;
          } else {
            const parsed = new Date(`${text}T00:00:00`);
            if (Number.isNaN(parsed.getTime())) {
              errors.push(`${label}.${field}: data inexistente ("${value}").`);
              rowInvalid = true;
            } else record[field] = text;
          }
        } else {
          record[field] = String(value).trim();
        }

        const allowed = schema.enums?.[field];
        if (allowed && record[field] !== undefined && !allowed.includes(record[field])) {
          errors.push(`${label}.${field}: valor "${record[field]}" não é aceito (use um de: ${allowed.join(', ')}).`);
          rowInvalid = true;
        }
      });

      schema.required.forEach((field) => {
        const value = record[field];
        if (value === undefined || value === null || value === '' || (typeof value === 'number' && !Number.isFinite(value))) {
          errors.push(`${label}: campo obrigatório ausente ou vazio: ${field}.`);
          rowInvalid = true;
        }
      });

      if (rowInvalid) return;

      const sourceId = typeof row.id === 'string' && row.id ? row.id : `${entity}#${index}`;
      if (ids.has(sourceId)) {
        errors.push(`Identificador duplicado no arquivo: ${sourceId}.`);
        rowInvalid = true;
      }
      if (rowInvalid) return;
      ids.set(sourceId, entity);
      normalized.push({ ...record, __source_id: sourceId });
    });

    data[entity] = normalized;
    preview.counts[entity] = normalized.length;
  });

  // Integridade referencial
  Object.entries(ENTITY_SCHEMAS).forEach(([entity, schema]) => {
    if (!schema.references) return;
    const list = data[entity] || [];
    list.forEach((record, index) => {
      Object.entries(schema.references).forEach(([field, target]) => {
        const value = record[field];
        if (!value) return;
        const targetIds = new Set([...(data[target] || []).map((item) => item.__source_id)]);
        if (!targetIds.has(value)) {
          errors.push(`${entity}[${index}].${field}: referência "${value}" não existe na coleção ${target} do arquivo.`);
        }
      });
    });
  });

  // Prévia financeira
  const transactions = data.Transaction || [];
  let income = 0;
  let expense = 0;
  let transfers = 0;
  let minDate = null;
  let maxDate = null;
  transactions.forEach((tx) => {
    if (isCancelled(tx)) return;
    const amount = Math.abs(toNumber(tx.amount));
    if (isTransfer(tx)) transfers += amount;
    else if (tx.kind === KIND.INCOME) income += amount;
    else expense += amount;
    const date = tx.settlement_date || tx.due_date || tx.competence_date;
    if (date) {
      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;
    }
  });

  preview.totals = {
    income: round2(income),
    expense: round2(expense),
    result: round2(income - expense),
    transfers: round2(transfers),
  };
  preview.period = minDate && maxDate ? { from: minDate, to: maxDate } : null;
  preview.samples = transactions.slice(0, 5).map((tx) => ({
    description: tx.description,
    amount: round2(toNumber(tx.amount)),
    kind: tx.kind,
    status: tx.status,
    date: tx.settlement_date || tx.due_date || tx.competence_date || null,
  }));
  preview.months = Array.from(new Set(transactions.map((tx) => monthKey(tx.settlement_date || tx.due_date)).filter(Boolean))).sort();

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    // Um arquivo com qualquer erro não é importado — a base atual permanece intacta.
    data: errors.length === 0 ? data : null,
    preview,
  };
};

/** Lê o texto do arquivo e delega a validação. */
export const parseBackupText = (text) => {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, errors: ['O arquivo está vazio.'], warnings: [], data: null, preview: null };
  }
  try {
    return validateBackup(JSON.parse(text));
  } catch (error) {
    return { ok: false, errors: [`O arquivo não é um JSON válido: ${error.message}`], warnings: [], data: null, preview: null };
  }
};

const stripFields = (record, fields) => {
  const clone = { ...record };
  delete clone.__source_id;
  fields.forEach((field) => delete clone[field]);
  return clone;
};

/** Para gravar: remove também o identificador de origem (a base gera ids novos). */
export const toInsertable = (record) => stripFields(record, SYSTEM_FIELDS);
/** Para exportar: mantém o id, que é a âncora da validação de referências. */
export const toExportable = (record) => stripFields(record, EXPORT_ONLY_STRIPPED);

export const buildBackupPayload = (collections = {}, meta = {}) => {
  const data = {};
  BACKUP_ENTITIES.forEach((entity) => {
    const rows = Array.isArray(collections[entity]) ? collections[entity] : [];
    data[entity] = rows.map(toExportable);
  });
  return {
    app: APP_ID,
    product: 'Data Fintech',
    format_version: FORMAT_VERSION,
    generated_at: meta.generated_at || new Date().toISOString(),
    generated_by: meta.generated_by || null,
    counts: Object.fromEntries(BACKUP_ENTITIES.map((entity) => [entity, data[entity].length])),
    data,
  };
};