/**
 * Fatura de cartão de crédito em PDF — modelo do documento extraído.
 *
 * Módulo puro: não grava nada, não cria lançamentos por conta própria e não
 * completa dado ausente com estimativa. Campo sem leitura confiável fica nulo
 * e é listado em `missing` / `warnings` para revisão manual.
 *
 * Distinção explícita exigida pelo fluxo:
 *  - document.fields ..... o que veio do documento (extraído)
 *  - document.calculated . o que é somado a partir dos lançamentos (calculado)
 *  - document.missing .... o que não foi identificado (ausente)
 */

import { round2 } from './money.js';
import { toISODate } from './periods.js';

export const MAX_INVOICE_ITEMS = 200;
const AMOUNT_TOLERANCE = 0.05;

export const ITEM_TYPE = Object.freeze({
  PURCHASE: 'compra',
  CHARGE: 'encargo',
  CREDIT: 'credito',
  PAYMENT: 'pagamento',
  SUMMARY: 'resumo',
});

export const ITEM_TYPE_LABELS = Object.freeze({
  compra: 'Compra',
  encargo: 'Juros e encargos',
  credito: 'Crédito ou estorno',
  pagamento: 'Pagamento',
  resumo: 'Resumo da fatura',
});

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatBRL = (value) => brl.format(Number(value) || 0);

const pad = (value) => String(value).padStart(2, '0');

const validDate = (year, month, day) => {
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return String(year) + '-' + pad(month) + '-' + pad(day);
};

/** Aceita AAAA-MM-DD e DD/MM/AAAA (ou DD/MM/AA). Qualquer outro formato retorna null. */
export const parseInvoiceDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return toISODate(value);
  const text = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const br = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/.exec(text);
  if (br) {
    const year = br[3].length === 2 ? 2000 + Number(br[3]) : Number(br[3]);
    return validDate(year, Number(br[2]), Number(br[1]));
  }
  return null;
};

/** Aceita número ou texto monetário ("R$ 1.234,56"). Devolve null quando não é valor. */
export const parseInvoiceAmount = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? round2(value) : null;
  if (typeof value !== 'string') return null;
  const clean = value.replace(/[^\d,.-]/g, '').trim();
  if (!clean || !/\d/.test(clean)) return null;
  const normalized = clean.indexOf(',') >= 0 ? clean.replace(/\./g, '').replace(',', '.') : clean;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? round2(parsed) : null;
};

/** Texto normalizado (sem acento/caixa) usado em comparações de descrição. */
export const slug = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const TYPE_HINTS = [
  { type: ITEM_TYPE.PAYMENT, words: ['pagamento', 'payment', 'pago', 'liquida'] },
  { type: ITEM_TYPE.CREDIT, words: ['estorno', 'credito', 'devolucao', 'reembolso', 'chargeback'] },
  { type: ITEM_TYPE.CHARGE, words: ['juros', 'encargo', 'iof', 'anuidade', 'multa', 'mora', 'tarifa', 'rotativo'] },
];

const normalizeType = (rawType, description) => {
  const typeText = slug(rawType);
  const all = [ITEM_TYPE.PURCHASE, ITEM_TYPE.CHARGE, ITEM_TYPE.CREDIT, ITEM_TYPE.PAYMENT, ITEM_TYPE.SUMMARY];
  if (typeText) {
    const direct = all.find((type) => typeText === type || typeText.indexOf(type) >= 0);
    if (direct) return direct;
  }
  const haystack = slug(String(rawType || '') + ' ' + String(description || ''));
  const hint = TYPE_HINTS.find((entry) => entry.words.some((word) => haystack.indexOf(word) >= 0));
  return hint ? hint.type : ITEM_TYPE.PURCHASE;
};

const toAmount = (value) => {
  const parsed = parseInvoiceAmount(value);
  if (parsed === null) return { amount: null, negative: false };
  return { amount: parsed, negative: parsed < 0 };
};

/**
 * Parcelas só existem quando o próprio texto do lançamento as indica
 * ("2/10", "PARCELA 3 DE 12"). É a defesa contra leituras que repetem a
 * mesma indicação em todos os itens do documento.
 */
export const installmentsFromText = (description) => {
  const text = String(description || '');
  const fraction = /(\d{1,2})\s*\/\s*(\d{1,2})/.exec(text);
  const words = /(?:parcela\s*)?(\d{1,2})\s*de\s*(\d{1,2})/i.exec(text);
  const match = fraction || words;
  if (!match) return null;
  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(current) || !Number.isFinite(total)) return null;
  if (total <= 1 || current < 1 || current > total) return null;
  return { current, total };
};

const normalizeItem = (raw, index) => {
  if (!raw || typeof raw !== 'object') return null;
  const description = String(raw.description || raw.descricao || '').trim().slice(0, 200);
  const parsed = toAmount(raw.amount !== undefined ? raw.amount : raw.value !== undefined ? raw.value : raw.valor);
  let type = normalizeType(raw.type !== undefined ? raw.type : raw.tipo, description);
  if (parsed.negative && type === ITEM_TYPE.PURCHASE) type = ITEM_TYPE.CREDIT;
  const amount = parsed.amount === null ? null : Math.abs(parsed.amount);
  const date = parseInvoiceDate(raw.date !== undefined ? raw.date : raw.data);

  const fromText = installmentsFromText(description);
  const currentRaw = Number(raw.installment_current !== undefined ? raw.installment_current : raw.parcela_atual);
  const totalRaw = Number(raw.installment_total !== undefined ? raw.installment_total : raw.parcelas_total);
  const fromDocument =
    Number.isFinite(currentRaw) && Number.isFinite(totalRaw) && totalRaw > 1 && currentRaw >= 1 && currentRaw <= totalRaw;

  const installmentCurrent = fromText ? fromText.current : fromDocument ? currentRaw : null;
  const installmentTotal = fromText ? fromText.total : fromDocument ? totalRaw : null;
  const installmentSource = fromText ? 'descricao' : fromDocument ? 'documento' : null;

  const issues = [];
  if (!description) issues.push('Descrição não identificada.');
  if (amount === null) issues.push('Valor não identificado.');
  if (!date) issues.push('Data não identificada.');

  return {
    id: 'item-' + index,
    type,
    description: description || 'Lançamento sem descrição',
    date,
    amount,
    installmentCurrent,
    installmentTotal,
    installmentSource,
    issues,
    defaultSelected: type === ITEM_TYPE.PAYMENT ? false : amount !== null && amount > 0,
  };
};

export const invoiceTotals = (items = []) => {
  const sum = (predicate) =>
    round2(items.filter(predicate).reduce((total, item) => total + (Number(item.amount) || 0), 0));
  const purchases = sum((item) => item.type === ITEM_TYPE.PURCHASE);
  const charges = sum((item) => item.type === ITEM_TYPE.CHARGE);
  const credits = sum((item) => item.type === ITEM_TYPE.CREDIT);
  const payments = sum((item) => item.type === ITEM_TYPE.PAYMENT);
  const summary = sum((item) => item.type === ITEM_TYPE.SUMMARY);
  return {
    purchases,
    charges,
    credits,
    payments,
    summary,
    itemsTotal: round2(purchases + charges),
    net: round2(purchases + charges - credits - payments),
  };
};

const unwrap = (raw) => {
  if (Array.isArray(raw)) return unwrap(raw[0]);
  if (!raw || typeof raw !== 'object') return {};
  if (raw.invoice && typeof raw.invoice === 'object') return raw.invoice;
  if (raw.output && typeof raw.output === 'object' && !raw.items && !raw.declared_total) return unwrap(raw.output);
  return raw;
};

const pick = (source, keys) => {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

/** Normaliza a resposta bruta da extração em um documento revisável. Nunca lança exceção. */
export const normalizeInvoiceDocument = (raw, options = {}) => {
  const accountId = options.accountId || null;
  const environment = options.environment || 'pf';
  const source = unwrap(raw);
  const rawItems = Array.isArray(source.items) ? source.items.slice(0, MAX_INVOICE_ITEMS) : [];
  const items = rawItems.map(normalizeItem).filter(Boolean);

  const declaredTotal = toAmount(pick(source, ['declared_total', 'total', 'total_value']));
  const previousBalance = toAmount(pick(source, ['previous_balance', 'saldo_anterior']));
  const minimumPayment = toAmount(pick(source, ['minimum_payment', 'pagamento_minimo']));

  const dueDate = parseInvoiceDate(pick(source, ['due_date', 'vencimento']));
  const closingDate = parseInvoiceDate(pick(source, ['closing_date', 'fechamento']));
  const periodTo = parseInvoiceDate(pick(source, ['period_to', 'fim_periodo'])) || closingDate;
  const periodFrom = parseInvoiceDate(pick(source, ['period_from', 'inicio_periodo']));
  const documentKind = slug(pick(source, ['document_kind', 'kind']));
  const institution = String(pick(source, ['institution', 'banco', 'issuer']) || '').trim().slice(0, 120);
  const cardMask = String(pick(source, ['card_mask', 'cartao', 'card']) || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);

  const totals = invoiceTotals(items);
  const missing = [];
  const warnings = [];

  // Leitura que repete a mesma parcela em todos os itens é descartada: seria
  // dado inventado aparecendo na conferência.
  const withDocumentInstallments = items.filter((item) => item.installmentSource === 'documento');
  const pairs = new Set(withDocumentInstallments.map((item) => item.installmentCurrent + '/' + item.installmentTotal));
  if (withDocumentInstallments.length > 1 && pairs.size === 1) {
    withDocumentInstallments.forEach((item) => {
      item.installmentCurrent = null;
      item.installmentTotal = null;
      item.installmentSource = null;
    });
    warnings.push(
      'O documento repetiu a mesma indicação de parcelas em todos os lançamentos: as parcelas foram ignoradas para não registrar dado incorreto.',
    );
  }

  if (!dueDate) missing.push('Data de vencimento');
  if (!closingDate) missing.push('Data de fechamento');
  if (declaredTotal.amount === null) missing.push('Valor total da fatura');
  if (previousBalance.amount === null) missing.push('Saldo anterior');
  if (!items.length) missing.push('Lançamentos detalhados');
  if (!institution) missing.push('Instituição financeira');
  if (!cardMask) missing.push('Identificação do cartão');

  if (documentKind.indexOf('ilegivel') >= 0 || documentKind.indexOf('unreadable') >= 0) {
    warnings.push('O documento foi classificado como ilegível na leitura. Revise todos os campos manualmente.');
  }
  if (!items.length) {
    warnings.push('Nenhum lançamento detalhado foi lido: só é possível importar o resumo da fatura.');
  }
  if (items.length >= MAX_INVOICE_ITEMS) {
    warnings.push(
      'O documento trouxe ' + MAX_INVOICE_ITEMS + ' lançamentos ou mais — a importação foi limitada a ' + MAX_INVOICE_ITEMS + ' itens.',
    );
  }

  const summaryOnly = items.length === 0 || items.every((item) => item.type === ITEM_TYPE.SUMMARY);
  const declared = declaredTotal.amount === null ? null : Math.abs(declaredTotal.amount);
  const expectedTotal =
    items.length > 0 || summaryOnly
      ? round2(
          Math.abs(previousBalance.amount || 0) + totals.purchases + totals.charges - totals.credits - totals.payments,
        )
      : null;
  const difference = declared !== null && expectedTotal !== null && items.length > 0 ? round2(declared - expectedTotal) : null;
  const matchesDeclared = difference !== null ? Math.abs(difference) <= AMOUNT_TOLERANCE : null;

  if (difference !== null && !matchesDeclared) {
    warnings.push(
      'A soma dos lançamentos (' +
        formatBRL(expectedTotal) +
        ') não fecha com o total declarado (' +
        formatBRL(declared) +
        '). Diferença de ' +
        formatBRL(difference) +
        '.',
    );
  }
  if (summaryOnly && declared === null) {
    warnings.push('Sem lançamentos e sem total declarado, não há o que importar deste documento.');
  }

  const withoutAmount = items.filter((item) => item.amount === null).length;
  if (withoutAmount > 0) warnings.push(withoutAmount + ' lançamento(s) sem valor identificado não podem ser importados.');

  const withoutDate = items.filter((item) => !item.date).length;
  if (withoutDate > 0) {
    warnings.push(withoutDate + ' lançamento(s) sem data: o período/vencimento da fatura será usado como referência.');
  }

  return {
    accountId,
    environment,
    institution,
    cardMask,
    dueDate,
    closingDate,
    periodFrom,
    periodTo,
    documentKind: documentKind || null,
    summaryOnly,
    items,
    fields: {
      declaredTotal: declared,
      previousBalance: previousBalance.amount === null ? null : Math.abs(previousBalance.amount),
      minimumPayment: minimumPayment.amount === null ? null : Math.abs(minimumPayment.amount),
    },
    calculated: Object.assign({}, totals, {
      expectedTotal,
      difference,
      matchesDeclared,
      itemsCount: items.length,
    }),
    missing,
    warnings,
    hasContent: items.length > 0 || declared !== null,
  };
};

export const itemSignature = (item) => {
  const amount = item.amount === null || item.amount === undefined ? '' : item.amount;
  return item.type + ':' + (item.date || '') + ':' + amount + ':' + slug(item.description);
};

const hash = (text) => {
  let value = 5381;
  for (let index = 0; index < text.length; index += 1) {
    value = ((value * 33) ^ text.charCodeAt(index)) >>> 0;
  }
  return value.toString(36);
};

/** Impressão digital do documento: cartão + período + vencimento + total + composição. */
export const invoiceFingerprint = (input = {}) => {
  const declared = input.declaredTotal;
  return hash(
    [
      input.accountId || '',
      input.dueDate || '',
      declared === null || declared === undefined ? '' : declared,
      input.periodFrom || '',
      input.periodTo || '',
      (input.items || []).map(itemSignature).sort().join('|'),
    ].join('::'),
  );
};

export const describeItem = (item) => {
  const installment =
    item.installmentTotal && item.installmentTotal > 1
      ? ' (' + (item.installmentCurrent || 1) + '/' + item.installmentTotal + ')'
      : '';
  return String(item.description + installment).trim();
};

export const invoiceCardLabel = (document) => {
  if (!document) return 'Fatura do cartão';
  const institution = document.institution || 'cartão';
  return document.cardMask ? 'Fatura ' + institution + ' •••• ' + document.cardMask : 'Fatura ' + institution;
};

export const itemReferenceDate = (document, item) =>
  item.date || document.periodTo || document.dueDate || null;

/**
 * Converte os lançamentos escolhidos em registros de Transaction.
 * Nada é gravado aqui: devolve apenas o payload. Pagamentos ficam de fora
 * porque já são representados pela transferência entre contas.
 */
export const buildInvoiceTransactions = (document, options = {}) => {
  const accountId = options.accountId;
  const environment = options.environment || 'pf';
  const selectedIds = options.selectedIds || [];
  const reference = invoiceCardLabel(document);

  return (document.items || [])
    .filter((item) => selectedIds.indexOf(item.id) >= 0 && item.type !== ITEM_TYPE.PAYMENT && item.amount > 0)
    .map((item) => {
      const date = itemReferenceDate(document, item);
      const isCredit = item.type === ITEM_TYPE.CREDIT;
      const notes = ['Importado de fatura em PDF (' + reference + ')'];
      if (document.dueDate) notes.push('vencimento ' + document.dueDate);
      if (item.issues.length) notes.push(item.issues.join(' '));

      const isSummary = item.type === ITEM_TYPE.SUMMARY;
      const description = isSummary
        ? reference + ' — venc. ' + (document.dueDate || 'não informado')
        : describeItem(item);

      const record = {
        description,
        kind: isCredit ? 'income' : 'expense',
        amount: item.amount,
        environment,
        account_id: accountId,
        card_invoice_account_id: accountId,
        competence_date: date,
        settlement_date: date,
        due_date: document.dueDate || date,
        status: 'settled',
        notes: notes.join(' · '),
      };
      return record;
    });
};