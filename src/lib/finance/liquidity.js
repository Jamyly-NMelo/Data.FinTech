/**
 * Indicadores de liquidez do ambiente empresarial (PJ).
 *
 * Fórmulas
 *  - Liquidez corrente = Ativo circulante ÷ Passivo circulante
 *  - Liquidez imediata = Disponibilidades ÷ Passivo circulante
 *
 * Composição usada (somente dados registrados, sem estimativas)
 *  - Disponibilidades ... saldo liquidado das contas de caixa, banco e poupança
 *                        (checking, savings, cash). Contas do tipo investimento
 *                        não são tratadas como disponibilidade automaticamente.
 *  - Ativo circulante ... disponibilidades + contas a receber em aberto
 *  - Passivo circulante . contas a pagar em aberto + faturas de cartão em aberto
 *                        + saldos devedores em contas de caixa/banco
 *
 * Regras
 *  - Transferências internas nunca entram: não são receita nem despesa.
 *  - Pagamentos parciais entram pelo valor liquidado (saldo da conta) e pelo valor
 *    em aberto (pendência) — settledAmount/openAmount evitam dupla contagem.
 *  - Pendências com data de competência/vencimento posterior à data de referência
 *    ficam fora do cálculo e são apenas informadas.
 *  - A entidade Debt não é somada aqui: uma dívida só compõe o passivo circulante
 *    quando lançada como conta a pagar, para não duplicar o mesmo compromisso.
 *  - Contas arquivadas ficam fora, como no restante do app.
 */

import { round2, safeDivide } from './money.js';
import { KIND, accountBalance, isCancelled, isTransfer, openAmount, projectionDate } from './ledger.js';
import { toISODate } from './periods.js';

export const CASH_ACCOUNT_TYPES = Object.freeze(['checking', 'savings', 'cash']);

/**
 * Faixas de referência dos indicadores. São referências genéricas de mercado:
 * o valor adequado varia por setor, prazo de recebimento e ciclo de caixa.
 */
export const LIQUIDITY_BANDS = Object.freeze({
  current: { healthy: 1.5, warning: 1 },
  quick: { healthy: 1, warning: 0.5 },
});

export const LIQUIDITY_STATUS_LABELS = Object.freeze({
  saudavel: 'Saudável',
  atencao: 'Atenção',
  critico: 'Crítica',
  indefinido: 'Não aplicável',
});

export const NOT_APPLICABLE_LIABILITIES = 'Não aplicável: passivo circulante igual a zero';

/** Classifica o índice dentro das faixas informadas (nunca inventa índice). */
export const liquidityStatus = (value, bands = LIQUIDITY_BANDS.current) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'indefinido';
  const ratio = Number(value);
  if (ratio >= bands.healthy) return 'saudavel';
  if (ratio >= bands.warning) return 'atencao';
  return 'critico';
};

const sumRows = (rows) => round2(rows.reduce((total, row) => total + row.amount, 0));

export const buildLiquidity = ({
  accounts = [],
  transactions = [],
  range = null,
  environment = 'pj',
  referenceDate = null,
  bands = LIQUIDITY_BANDS,
} = {}) => {
  const reference = toISODate(range?.to) || toISODate(referenceDate) || toISODate(new Date());
  const warnings = [];

  const scopedAccounts = accounts.filter((account) => account.environment === environment && !account.archived);
  const cashAccounts = scopedAccounts.filter((account) => CASH_ACCOUNT_TYPES.includes(account.type));
  const cardAccounts = scopedAccounts.filter((account) => account.type === 'credit_card');

  const cashRows = cashAccounts.map((account) => ({
    id: account.id,
    label: account.name,
    institution: account.institution || null,
    amount: accountBalance(account, transactions, { until: reference }),
  }));

  const availableRows = cashRows.filter((row) => row.amount > 0);
  const overdraftRows = cashRows
    .filter((row) => row.amount < 0)
    .map((row) => ({ ...row, amount: Math.abs(row.amount) }));

  const cardRows = cardAccounts
    .map((account) => ({
      id: account.id,
      label: account.name,
      amount: accountBalance(account, transactions, { until: reference }),
    }))
    .filter((row) => row.amount < 0)
    .map((row) => ({ ...row, amount: Math.abs(row.amount) }));

  const available = sumRows(availableRows);
  const overdrafts = sumRows(overdraftRows);
  const cardInvoices = sumRows(cardRows);

  const openItems = transactions
    .filter(
      (tx) =>
        tx.environment === environment && !isCancelled(tx) && !isTransfer(tx) && openAmount(tx) > 0,
    )
    .map((tx) => ({
      id: tx.id,
      description: tx.description || 'Lançamento sem descrição',
      kind: tx.kind,
      date: projectionDate(tx),
      amount: openAmount(tx),
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const withinReference = openItems.filter((item) => !item.date || item.date <= reference);
  const afterReferenceItems = openItems.filter((item) => item.date && item.date > reference);

  const receivableItems = withinReference.filter((item) => item.kind === KIND.INCOME);
  const payableItems = withinReference.filter((item) => item.kind === KIND.EXPENSE);
  const receivables = sumRows(receivableItems);
  const payables = sumRows(payableItems);

  const currentAssets = round2(available + receivables);
  const currentLiabilities = round2(payables + cardInvoices + overdrafts);
  const hasLiabilities = currentLiabilities > 0;

  const currentRatio = hasLiabilities ? round2(safeDivide(currentAssets, currentLiabilities)) : null;
  const quickRatio = hasLiabilities ? round2(safeDivide(available, currentLiabilities)) : null;

  const hasAccounts = scopedAccounts.length > 0;
  const hasData = hasAccounts || openItems.length > 0;

  if (!hasAccounts) warnings.push('Nenhuma conta do ambiente PJ cadastrada: disponibilidades e faturas ficam zeradas.');
  else if (cashAccounts.length === 0)
    warnings.push('Nenhuma conta de caixa ou banco no PJ. Só contas dos tipos caixa, banco e poupança compõem as disponibilidades.');

  return {
    environment,
    referenceDate: reference,
    bands,
    available,
    availableRows,
    overdraftRows,
    overdrafts,
    cardRows,
    cardInvoices,
    receivableItems,
    receivables,
    payableItems,
    payables,
    currentAssets,
    currentLiabilities,
    currentRatio,
    quickRatio,
    currentStatus: liquidityStatus(currentRatio, bands.current),
    quickStatus: liquidityStatus(quickRatio, bands.quick),
    hasLiabilities,
    hasAccounts,
    hasData,
    afterReference: {
      count: afterReferenceItems.length,
      receivables: sumRows(afterReferenceItems.filter((item) => item.kind === KIND.INCOME)),
      payables: sumRows(afterReferenceItems.filter((item) => item.kind === KIND.EXPENSE)),
    },
    notApplicableMessage: hasLiabilities ? null : NOT_APPLICABLE_LIABILITIES,
    warnings,
  };
};