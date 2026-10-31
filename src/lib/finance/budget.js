/** Orçamento por categoria: previsto x realizado no mês. */

import { percent, round2, toNumber } from './money.js';
import { isCancelled, isTransfer, realizedDate, settledAmount } from './ledger.js';
import { monthKey } from './periods.js';

export const budgetStatus = (budget = {}, spent = 0) => {
  const amount = round2(toNumber(budget.amount));
  const used = round2(toNumber(spent));
  const remaining = round2(amount - used);
  const usedPercent = amount > 0 ? round2(percent(used, amount)) : used > 0 ? 100 : 0;
  const alertAt = round2(toNumber(budget.alert_percent) || 80);
  let status = 'ok';
  if (amount <= 0 && used > 0) status = 'sem-limite';
  else if (usedPercent >= 100) status = 'estourado';
  else if (usedPercent >= alertAt) status = 'atencao';
  return { amount, spent: used, remaining, usedPercent, status, alert_percent: alertAt };
};

export const spentByCategory = (transactions = [], month) => {
  const map = new Map();
  transactions.forEach((tx) => {
    if (isCancelled(tx) || isTransfer(tx) || tx.kind !== 'expense') return;
    if (!tx.category_id) return;
    if (month && monthKey(realizedDate(tx)) !== month) return;
    map.set(tx.category_id, round2((map.get(tx.category_id) || 0) + settledAmount(tx)));
  });
  return map;
};

export const buildBudgets = ({ budgets = [], transactions = [], categories = [], month, environment = 'pj' } = {}) => {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const spentMap = spentByCategory(transactions, month);

  return budgets
    .filter((budget) => (!month || budget.month === month))
    .filter((budget) => environment === 'consolidado' || !budget.environment || budget.environment === environment)
    .map((budget) => {
      const category = byId.get(budget.category_id);
      const metrics = budgetStatus(budget, spentMap.get(budget.category_id) || 0);
      return {
        ...metrics,
        budget,
        category_name: category?.name || 'Categoria removida',
        category_missing: !category,
        environment: budget.environment,
        month: budget.month,
      };
    })
    .sort((a, b) => b.usedPercent - a.usedPercent);
};

export const budgetOverview = (rows = []) => {
  const planned = round2(rows.reduce((total, row) => total + row.amount, 0));
  const spent = round2(rows.reduce((total, row) => total + row.spent, 0));
  return {
    planned,
    spent,
    remaining: round2(planned - spent),
    usedPercent: planned > 0 ? round2(percent(spent, planned)) : 0,
    overCount: rows.filter((row) => row.status === 'estourado').length,
    warningCount: rows.filter((row) => row.status === 'atencao').length,
  };
};