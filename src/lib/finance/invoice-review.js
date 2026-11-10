/**
 * Conferência da fatura importada: duplicidades, seleção e resumo das alterações.
 * Módulo puro — nada aqui grava. A gravação só acontece após a confirmação.
 */

import { ITEM_TYPE, ITEM_TYPE_LABELS, describeItem, formatBRL, invoiceFingerprint, slug } from './invoice.js';
import { round2 } from './money.js';
import { toISODate } from './periods.js';

const sameDate = (left, right) => {
  const a = toISODate(left);
  const b = toISODate(right);
  return Boolean(a && b && a === b);
};

const sameAmount = (left, right) => Math.abs((Number(left) || 0) - (Number(right) || 0)) < 0.005;

const similarDescription = (left, right) => {
  const a = slug(left);
  const b = slug(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  return shorter.length >= 6 && longer.includes(shorter);
};

const txDate = (tx) => tx?.settlement_date || tx?.competence_date || tx?.due_date || null;

/**
 * Duplicidade da fatura. Regra do projeto: valor igual, isoladamente, nunca é
 * prova de duplicidade — só a impressão digital do documento é bloqueante.
 */
export const findInvoiceDuplicates = (document, { invoices = [], transactions = [], accountId = null } = {}) => {
  const fingerprint = invoiceFingerprint({ ...document, accountId, declaredTotal: document?.fields?.declaredTotal });
  const confirmed = (invoices || []).filter((invoice) => invoice && invoice.status !== 'descartado');
  const blockers = [];
  const alerts = [];

  // A impressão digital do documento original também bloqueia: editar o total na
  // conferência não pode liberar a reimportação do mesmo PDF.
  const fingerprints = [fingerprint];
  if (document?.extractedFingerprint && document.extractedFingerprint !== fingerprint) {
    fingerprints.push(document.extractedFingerprint);
  }
  const reimported =
    confirmed.find((invoice) => invoice.fingerprint && fingerprints.indexOf(invoice.fingerprint) >= 0) || null;
  if (reimported) {
    blockers.push({
      code: 'documento_reimportado',
      message: `Este documento já foi importado${
        reimported.due_date ? ` (fatura com vencimento em ${reimported.due_date})` : ''
      }. Importar de novo criaria lançamentos repetidos.`,
    });
  }

  const sameDueDate = confirmed.find(
    (invoice) => invoice.account_id === accountId && invoice.due_date && document?.dueDate && invoice.due_date === document.dueDate,
  );
  if (sameDueDate && !reimported) {
    alerts.push({
      code: 'vencimento_repetido',
      message: `Já existe uma fatura importada para este cartão com vencimento em ${document.dueDate}.`,
    });
  }

  const sameTotal = confirmed.find(
    (invoice) =>
      invoice.account_id === accountId &&
      !reimported &&
      invoice.declared_total &&
      document?.fields?.declaredTotal &&
      sameAmount(invoice.declared_total, document.fields.declaredTotal),
  );
  if (sameTotal && !sameDueDate) {
    alerts.push({
      code: 'valor_repetido',
      message: 'O total desta fatura é igual ao de uma fatura já importada. Valor igual não confirma duplicidade — confira o período.',
    });
  }

  const from = document?.periodFrom;
  const to = document?.periodTo || document?.dueDate;
  const inPeriod = (transactions || []).filter((tx) => {
    if (tx.account_id !== accountId) return false;
    const date = txDate(tx);
    if (!date || !from || !to) return false;
    return date >= from && date <= to;
  });
  if (inPeriod.length > 0) {
    alerts.push({
      code: 'cartao_com_movimento',
      message: `O cartão já tem ${inPeriod.length} lançamento(s) no período desta fatura. Compras repetidas serão marcadas como possível duplicidade.`,
    });
  }

  return { fingerprint, blockers, alerts, alreadyImported: reimported, periodTransactions: inPeriod.length };
};

/**
 * Marca cada lançamento com eventual contrapartida já registrada no cartão.
 * `forte` (valor + data + descrição parecidos) desmarca o item por padrão.
 */
export const reviewItems = (document, { transactions = [], accountId = null, selectedIds = null } = {}) =>
  (document?.items || []).map((item) => {
    const candidates = (transactions || []).filter(
      (tx) => tx.account_id === accountId && sameAmount(tx.amount, item.amount) && sameDate(txDate(tx), item.date),
    );
    const strong = candidates.find((tx) => similarDescription(tx.description, item.description));
    const duplicate = strong
      ? { level: 'forte', transactionId: strong.id, label: 'Já registrado' }
      : candidates.length
        ? { level: 'parcial', transactionId: candidates[0].id, label: 'Valor e data iguais' }
        : null;
    const selected =
      selectedIds !== null && selectedIds !== undefined
        ? selectedIds.includes(item.id)
        : Boolean(item.defaultSelected) && !(duplicate && duplicate.level === 'forte');
    return { ...item, duplicate, selected };
  });

export const toggleItem = (items, id) => items.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item));

export const updateItem = (items, id, patch) =>
  items.map((item) => (item.id === id ? { ...item, ...patch, issues: patch.issues ?? item.issues } : item));

/** Resumo das alterações que a confirmação vai realizar. */
export const buildReview = ({ document, items = [], duplicates = null, accountId = null } = {}) => {
  const selected = items.filter((item) => item.selected);
  const creatable = selected.filter((item) => item.type !== ITEM_TYPE.PAYMENT && item.amount > 0);
  // Pagamentos identificados nunca são importados: já são a transferência entre contas.
  const payments = items.filter((item) => item.type === ITEM_TYPE.PAYMENT);
  const expenses = creatable.filter((item) => item.type !== ITEM_TYPE.CREDIT);
  const credits = creatable.filter((item) => item.type === ITEM_TYPE.CREDIT);
  const expensesTotal = round2(expenses.reduce((total, item) => total + item.amount, 0));
  const creditsTotal = round2(credits.reduce((total, item) => total + item.amount, 0));
  const createTotal = round2(expensesTotal - creditsTotal);

  const errors = [];
  if (!accountId) errors.push('Escolha o cartão que receberá os lançamentos.');
  if (duplicates?.blockers?.length) errors.push(...duplicates.blockers.map((item) => item.message));
  if (creatable.length === 0) errors.push('Selecione ao menos um lançamento para importar.');
  if (creatable.some((item) => !item.amount || item.amount <= 0)) {
    errors.push('Há lançamentos selecionados sem valor identificado.');
  }
  if (creatable.some((item) => !(item.date || document?.periodTo || document?.dueDate))) {
    errors.push('Há lançamentos sem data e sem vencimento de referência para o lançamento.');
  }
  if (creatable.some((item) => {
    const hasCurrent = item.installmentCurrent !== null && item.installmentCurrent !== undefined;
    const hasTotal = item.installmentTotal !== null && item.installmentTotal !== undefined;
    if (!hasCurrent && !hasTotal) return false;
    return !hasCurrent || !hasTotal ||
      !Number.isInteger(Number(item.installmentCurrent)) ||
      !Number.isInteger(Number(item.installmentTotal)) ||
      Number(item.installmentTotal) <= 1 ||
      Number(item.installmentCurrent) < 1 ||
      Number(item.installmentCurrent) > Number(item.installmentTotal);
  })) {
    errors.push('Revise a parcela atual e o total de parcelas dos lançamentos selecionados.');
  }

  const byType = Object.values(ITEM_TYPE).reduce((acc, type) => {
    const list = creatable.filter((item) => item.type === type);
    if (list.length) acc[type] = { count: list.length, total: round2(list.reduce((total, item) => total + item.amount, 0)) };
    return acc;
  }, {});

  const changes = [];
  if (creatable.length) {
    changes.push(
      `${creatable.length} lançamento(s) serão criados no cartão selecionado${
        document?.cardMask ? ` (•••• ${document.cardMask})` : ''
      }.`,
    );
    if (expensesTotal > 0) changes.push(`Despesas e encargos: ${formatBRL(expensesTotal)}.`);
    if (creditsTotal > 0) changes.push(`Créditos e estornos: ${formatBRL(creditsTotal)} (entram como entrada no cartão).`);
    changes.push(`Impacto no saldo do cartão: ${formatBRL(createTotal)} a débito.`);
  }
  if (payments.length) {
    changes.push(
      `${payments.length} pagamento(s) da fatura não serão importados: registre a transferência entre contas para não duplicar o valor.`,
    );
  }
  changes.push('Nenhuma dívida nem conta a pagar será criada com o total da fatura — o cartão já representa essa obrigação.');
  changes.push('Seus lançamentos anteriores não serão alterados.');

  return {
    canConfirm: errors.length === 0,
    errors,
    createCount: creatable.length,
    createTotal,
    expensesTotal,
    creditsTotal,
    paymentsCount: payments.length,
    skipped: items.length - creatable.length,
    duplicatesCount: items.filter((item) => item.duplicate).length,
    byType,
    byTypeLabels: Object.fromEntries(Object.keys(byType).map((type) => [type, ITEM_TYPE_LABELS[type]])),
    changes,
    selectedIds: creatable.map((item) => item.id),
  };
};

export const describeSummaryLine = (item) => describeItem(item);