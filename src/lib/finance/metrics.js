/** Indicadores financeiros derivados exclusivamente dos lançamentos reais. */

import { percent, round2, safeDivide, sumBy, toNumber, variation } from './money.js';
import {
  KIND,
  STATUS,
  accountBalance,
  agendaByDay,
  isCancelled,
  isTransfer,
  openAmount,
  openItemsWithin,
  projectionDate,
  realizedDate,
  settledAmount,
} from './ledger.js';
import { addDays, inRange, monthKey, recentMonths, toISODate } from './periods.js';
import { positionValue } from './investments.js';

export const ENVIRONMENTS = [
  { value: 'pf', label: 'Finanças Pessoais', short: 'PF' },
  { value: 'pj', label: 'Finanças Empresariais', short: 'PJ' },
  { value: 'invest', label: 'Investimentos', short: 'INV' },
  { value: 'consolidado', label: 'Visão Consolidada', short: 'CONS' },
];

export const matchesEnvironment = (tx, environment = 'consolidado') =>
  !environment || environment === 'consolidado' || tx?.environment === environment;

export const filterTransactions = (
  transactions = [],
  { environment = 'consolidado', accountId = 'all', categoryId = 'all', status = 'all' } = {},
) =>
  transactions.filter((tx) => {
    if (!matchesEnvironment(tx, environment)) return false;
    if (accountId && accountId !== 'all' && tx.account_id !== accountId && tx.counterpart_account_id !== accountId) return false;
    if (categoryId && categoryId !== 'all' && tx.category_id !== categoryId) return false;
    if (status && status !== 'all' && tx.status !== status) return false;
    return true;
  });

export const withinRange = (transactions = [], range, mode = 'realized') => {
  if (!range || (!range.from && !range.to)) return transactions;
  return transactions.filter((tx) => inRange(mode === 'projection' ? projectionDate(tx) : realizedDate(tx), range));
};

/** Só o que já foi liquidado (base de saldos e resultado realizado). */
export const realizedRows = (transactions = []) =>
  transactions.filter((tx) => !isCancelled(tx) && settledAmount(tx) > 0);

/** O que ainda está em aberto (base de projeções e compromissos). */
export const openRows = (transactions = []) =>
  transactions.filter((tx) => !isCancelled(tx) && openAmount(tx) > 0);

/**
 * Resumo econômico. Transferências internas ficam fora do resultado
 * (aparecem apenas como volume movimentado).
 */
export const summarize = (transactions = []) => {
  let income = 0;
  let expense = 0;
  let transferVolume = 0;
  let pendingIncome = 0;
  let pendingExpense = 0;

  transactions.forEach((tx) => {
    if (isCancelled(tx)) return;
    const settled = settledAmount(tx);
    const open = openAmount(tx);
    if (isTransfer(tx)) {
      transferVolume += settled;
      return;
    }
    if (tx.kind === KIND.INCOME) {
      income += settled;
      pendingIncome += open;
    } else {
      expense += settled;
      pendingExpense += open;
    }
  });

  const result = income - expense;
  return {
    income: round2(income),
    expense: round2(expense),
    result: round2(result),
    margin: percent(result, income, 2),
    transferVolume: round2(transferVolume),
    pendingIncome: round2(pendingIncome),
    pendingExpense: round2(pendingExpense),
    pendingResult: round2(pendingIncome - pendingExpense),
  };
};

export const comparePeriods = (current, previous) => ({
  income: variation(current.income, previous.income),
  expense: variation(current.expense, previous.expense),
  result: variation(current.result, previous.result),
  margin: round2(toNumber(current.margin) - toNumber(previous.margin)),
});

/** Resumo pronto para a tela, a partir dos lançamentos e filtros escolhidos. */
export const periodSummary = (transactions = [], range, previousWindow = null) => {
  const current = summarize(withinRange(realizedRows(transactions), range));
  const previous = previousWindow ? summarize(withinRange(realizedRows(transactions), previousWindow)) : null;
  return {
    current,
    previous,
    comparison: previous ? comparePeriods(current, previous) : null,
  };
};

/** Despesas por categoria (compartilhado com o gráfico de distribuição). */
export const categoryBreakdown = (transactions = [], categories = [], kind = KIND.EXPENSE) => {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const map = new Map();
  let total = 0;
  transactions.forEach((tx) => {
    if (isCancelled(tx) || isTransfer(tx) || tx.kind !== kind) return;
    const amount = settledAmount(tx);
    if (amount <= 0) return;
    const key = tx.category_id || 'sem-categoria';
    map.set(key, round2((map.get(key) || 0) + amount));
    total += amount;
  });
  return Array.from(map.entries())
    .map(([categoryId, value]) => {
      const category = byId.get(categoryId);
      return {
        category_id: categoryId,
        name: category?.name || (categoryId === 'sem-categoria' ? 'Sem categoria' : 'Categoria removida'),
        color: category?.color || null,
        value,
        share: percent(value, total, 1),
      };
    })
    .sort((a, b) => b.value - a.value);
};

/** Entradas x saídas por mês, para o gráfico de comparação mensal. */
export const monthlyFlow = (transactions = [], months = 6) => {
  const keys = recentMonths(months);
  const rows = keys.map((key) => ({ month: key, income: 0, expense: 0, result: 0, transferVolume: 0 }));
  const index = new Map(keys.map((key, position) => [key, position]));
  transactions.forEach((tx) => {
    if (isCancelled(tx)) return;
    const key = monthKey(realizedDate(tx));
    if (!index.has(key)) return;
    const row = rows[index.get(key)];
    const amount = settledAmount(tx);
    if (amount <= 0) return;
    if (isTransfer(tx)) {
      row.transferVolume = round2(row.transferVolume + amount);
      return;
    }
    if (tx.kind === KIND.INCOME) row.income = round2(row.income + amount);
    else row.expense = round2(row.expense + amount);
  });
  rows.forEach((row) => {
    row.result = round2(row.income - row.expense);
  });
  return rows;
};

export const netWorth = (accounts = [], transactions = [], investments = [], { until } = {}) => {
  let cash = 0;
  let brokerageCash = 0;
  let liabilities = 0;

  accounts.forEach((account) => {
    const balance = accountBalance(account, transactions, { until });
    if (account.type === 'credit_card') liabilities += Math.max(0, -balance);
    else if (account.type === 'investment') brokerageCash += balance;
    else cash += balance;
  });

  const portfolio = round2(investments.reduce((total, investment) => total + positionValue(investment), 0));
  const assets = round2(cash + brokerageCash + portfolio);
  const equity = round2(assets - liabilities);

  return {
    cash: round2(cash),
    brokerageCash: round2(brokerageCash),
    portfolio,
    assets,
    liabilities: round2(liabilities),
    equity,
  };
};

/** Evolução patrimonial (saldos liquidados em contas + carteira na cotação atual). */
export const equityEvolution = (accounts = [], transactions = [], investments = [], months = 12) => {
  const keys = recentMonths(months);
  const portfolio = round2(investments.reduce((total, investment) => total + positionValue(investment), 0));
  return keys.map((key) => {
    const accountTotal = accounts.reduce(
      (total, account) => total + accountBalance(account, transactions, { until: `${key}-31` }),
      0,
    );
    return { month: key, equity: round2(accountTotal + portfolio), accounts: round2(accountTotal), portfolio };
  });
};

/** Autonomia financeira: quantos meses o saldo disponível cobre. */
export const averageMonthlyExpense = (transactions = [], months = 3) => {
  const keys = new Set(recentMonths(months));
  const total = transactions.reduce((sum, tx) => {
    if (isCancelled(tx) || isTransfer(tx) || tx.kind !== KIND.EXPENSE) return sum;
    const key = monthKey(realizedDate(tx));
    if (!keys.has(key)) return sum;
    return sum + settledAmount(tx);
  }, 0);
  return round2(total / months);
};

export const financialAutonomy = (liquidBalance, transactions = [], months = 3) => {
  const average = averageMonthlyExpense(transactions, months);
  if (average <= 0) return { average, months: null, status: 'sem-base' };
  const coverage = round2(safeDivide(liquidBalance, average));
  let status = 'saudavel';
  if (coverage < 1) status = 'critico';
  else if (coverage < 3) status = 'atencao';
  return { average, months: coverage, status };
};

export const upcomingCommitments = (transactions = [], { days = 30, today = new Date(), kinds = [KIND.EXPENSE] } = {}) => {
  const from = toISODate(today);
  const to = toISODate(addDays(today, days));
  const items = openItemsWithin(transactions, { from, to, kinds });
  return {
    total: round2(items.reduce((total, item) => total + item.open_amount, 0)),
    count: items.length,
    items,
  };
};

export const upcomingAgenda = (transactions = [], { days = 10, today = new Date() } = {}) => {
  const from = toISODate(today);
  const to = toISODate(addDays(today, days));
  return agendaByDay(transactions, { from, to });
};

export const liquidBalance = (accounts = [], transactions = []) =>
  round2(
    accounts
      .filter((account) => ['checking', 'savings', 'cash'].includes(account.type) && !account.archived)
      .reduce((total, account) => total + accountBalance(account, transactions), 0),
  );

/**
 * Projeção de saldo a partir das pendências lançadas + média realizada.
 * Deixa explícito que é uma projeção, nunca um valor realizado.
 */
export const cashProjection = (accounts = [], transactions = [], { months = 12, today = new Date() } = {}) => {
  const start = liquidBalance(accounts, transactions);
  const averageIn = round2(
    averageMonthlyIncome(transactions, 3),
  );
  const averageOut = averageMonthlyExpense(transactions, 3);
  const keys = recentMonths(months, new Date(addDays(today, 31)));
  let running = start;
  return keys.map((key) => {
    const pending = transactions
      .filter((tx) => !isCancelled(tx) && openAmount(tx) > 0 && monthKey(projectionDate(tx)) === key)
      .reduce(
        (total, tx) => total + (tx.kind === KIND.INCOME ? openAmount(tx) : -openAmount(tx)),
        0,
      );
    const hasPending = pending !== 0;
    running = round2(running + pending + (hasPending ? 0 : averageIn - averageOut));
    return {
      month: key,
      pending: round2(pending),
      baseline: hasPending ? 0 : round2(averageIn - averageOut),
      projected: running,
      source: hasPending ? 'pendências' : 'média',
    };
  });
};

export const averageMonthlyIncome = (transactions = [], months = 3) => {
  const keys = new Set(recentMonths(months));
  const total = transactions.reduce((sum, tx) => {
    if (isCancelled(tx) || isTransfer(tx) || tx.kind !== KIND.INCOME) return sum;
    const key = monthKey(realizedDate(tx));
    if (!keys.has(key)) return sum;
    return sum + settledAmount(tx);
  }, 0);
  return round2(total / months);
};

export const totalByStatus = (transactions = []) => ({
  settled: round2(sumBy(transactions.filter((tx) => tx.status === STATUS.SETTLED), settledAmount)),
  pending: round2(sumBy(transactions.filter((tx) => tx.status === STATUS.PENDING), openAmount)),
  cancelled: transactions.filter((tx) => tx.status === STATUS.CANCELLED).length,
});