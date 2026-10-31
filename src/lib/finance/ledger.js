/**
 * Livro-caixa: regras de liquidação, saldos e pendências.
 *
 * Convenção dos lançamentos:
 *  - income   → account_id é a conta de destino (entrada)
 *  - expense  → account_id é a conta de origem (saída)
 *  - transfer → account_id é a origem e counterpart_account_id é o destino
 *
 * Transferências são movimentos internos: afetam saldos, nunca o resultado econômico.
 */

import { round2, toNumber } from './money.js';
import { inRange, toISODate } from './periods.js';

export const KIND = Object.freeze({ INCOME: 'income', EXPENSE: 'expense', TRANSFER: 'transfer' });
export const STATUS = Object.freeze({ PENDING: 'pending', SETTLED: 'settled', CANCELLED: 'cancelled' });

export const isCancelled = (tx) => !tx || tx.status === STATUS.CANCELLED;
export const isSettled = (tx) => !!tx && tx.status === STATUS.SETTLED;
export const isPending = (tx) => !!tx && tx.status === STATUS.PENDING;
export const isTransfer = (tx) => !!tx && tx.kind === KIND.TRANSFER;
export const isEconomic = (tx) => !!tx && !isCancelled(tx) && !isTransfer(tx);

/** Data usada para o que já foi liquidado. */
export const realizedDate = (tx) => toISODate(tx?.settlement_date) || toISODate(tx?.due_date) || toISODate(tx?.competence_date);
/** Data usada em projeções e agendas. */
export const projectionDate = (tx) => toISODate(tx?.due_date) || toISODate(tx?.settlement_date) || toISODate(tx?.competence_date);

export const totalAmount = (tx) => round2(Math.abs(toNumber(tx?.amount)));

/** Valor já liquidado — considera pagamentos/recebimentos parciais. */
export const settledAmount = (tx) => {
  if (!tx || isCancelled(tx)) return 0;
  const total = totalAmount(tx);
  const partial = Math.max(0, toNumber(tx.settled_amount));
  if (partial > 0) return round2(Math.min(partial, total));
  return isSettled(tx) ? total : 0;
};

/** Valor ainda em aberto (o que falta liquidar). */
export const openAmount = (tx) => {
  if (!tx || isCancelled(tx)) return 0;
  return round2(Math.max(0, totalAmount(tx) - settledAmount(tx)));
};

export const isPartiallySettled = (tx) => settledAmount(tx) > 0 && openAmount(tx) > 0;

export const statusLabel = (tx) => {
  if (!tx) return '—';
  if (isCancelled(tx)) return 'Cancelado';
  if (isPartialPending(tx)) return 'Parcial';
  return isSettled(tx) ? 'Liquidado' : 'Pendente';
};

const isPartialPending = (tx) => isPending(tx) && settledAmount(tx) > 0;

/** Saldo da conta considerando apenas movimentos liquidados. */
export const accountBalance = (account, transactions = [], { until } = {}) => {
  if (!account) return 0;
  let balance = toNumber(account.opening_balance);
  transactions.forEach((tx) => {
    if (isCancelled(tx)) return;
    if (until && realizedDate(tx) && realizedDate(tx) > until) return;
    const amount = settledAmount(tx);
    if (amount === 0) return;
    if (tx.kind === KIND.INCOME && tx.account_id === account.id) balance += amount;
    else if (tx.kind === KIND.EXPENSE && tx.account_id === account.id) balance -= amount;
    else if (tx.kind === KIND.TRANSFER) {
      if (tx.account_id === account.id) balance -= amount;
      if (tx.counterpart_account_id === account.id) balance += amount;
    }
  });
  return round2(balance);
};

export const accountBalances = (accounts = [], transactions = [], options = {}) => {
  const map = {};
  accounts.forEach((account) => {
    map[account.id] = accountBalance(account, transactions, options);
  });
  return map;
};

/** Pendências (o que falta liquidar) com vencimento dentro da janela informada. */
export const openItemsWithin = (transactions = [], { from, to, kinds = null } = {}) => {
  const range = { from: toISODate(from), to: toISODate(to) };
  return transactions
    .filter((tx) => {
      if (isCancelled(tx) || isTransfer(tx)) return false;
      if (openAmount(tx) <= 0) return false;
      if (kinds && !kinds.includes(tx.kind)) return false;
      return inRange(projectionDate(tx), range);
    })
    .map((tx) => ({ ...tx, open_amount: openAmount(tx) }))
    .sort((a, b) => String(projectionDate(a)).localeCompare(String(projectionDate(b))));
};

/** Agenda de vencimentos e recebimentos agrupada por dia. */
export const agendaByDay = (transactions = [], { from, to } = {}) => {
  const items = openItemsWithin(transactions, { from, to });
  const groups = new Map();
  items.forEach((tx) => {
    const date = projectionDate(tx);
    if (!groups.has(date)) groups.set(date, { date, items: [], inflow: 0, outflow: 0 });
    const group = groups.get(date);
    group.items.push(tx);
    if (tx.kind === KIND.INCOME) group.inflow = round2(group.inflow + tx.open_amount);
    else group.outflow = round2(group.outflow + tx.open_amount);
  });
  return Array.from(groups.values())
    .map((group) => ({ ...group, net: round2(group.inflow - group.outflow) }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
};

/** Ajustes válidos: lançamentos liquidados usados como âncora de saldo inicial. */
export const isBalanceAdjustment = (tx) => !isCancelled(tx) && settledAmount(tx) > 0;