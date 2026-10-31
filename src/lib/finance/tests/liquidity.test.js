/**
 * Testes dos indicadores de liquidez do ambiente PJ.
 * Execução: node --test src/lib/finance/tests/liquidity.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLiquidity, liquidityStatus, LIQUIDITY_BANDS } from '../liquidity.js';

const RANGE = { from: '2026-10-01', to: '2026-10-31' };

const account = (over = {}) => ({
  id: 'acc-check',
  name: 'Conta PJ',
  type: 'checking',
  environment: 'pj',
  opening_balance: 10000,
  archived: false,
  ...over,
});

const tx = (over = {}) => ({
  id: `tx-${Math.random().toString(36).slice(2, 8)}`,
  description: 'Lançamento',
  kind: 'expense',
  amount: 0,
  environment: 'pj',
  status: 'settled',
  account_id: 'acc-check',
  settlement_date: '2026-10-05',
  due_date: '2026-10-05',
  settled_amount: 0,
  ...over,
});

test('liquidez corrente e imediata com dados válidos', () => {
  const accounts = [
    account(),
    account({ id: 'acc-savings', name: 'Poupança PJ', type: 'savings', opening_balance: 0 }),
    account({ id: 'acc-card', name: 'Cartão PJ', type: 'credit_card', opening_balance: 0 }),
    account({ id: 'acc-inv', name: 'Corretora PJ', type: 'investment', opening_balance: 50000 }),
  ];
  const transactions = [
    tx({ kind: 'income', amount: 5000, account_id: 'acc-check', settlement_date: '2026-10-05' }),
    tx({ kind: 'transfer', amount: 1000, account_id: 'acc-check', counterpart_account_id: 'acc-savings', settlement_date: '2026-10-08' }),
    tx({ kind: 'expense', amount: 800, account_id: 'acc-card', settlement_date: '2026-10-12' }),
    tx({ kind: 'expense', amount: 4000, status: 'pending', account_id: null, settlement_date: null, due_date: '2026-10-20' }),
    tx({ kind: 'income', amount: 2000, status: 'pending', account_id: null, settlement_date: null, due_date: '2026-10-18' }),
  ];

  const result = buildLiquidity({ accounts, transactions, range: RANGE });

  // Conta corrente 10000 + 5000 - 1000 = 14000; poupança 1000 → 15000.
  assert.equal(result.available, 15000);
  // Conta de investimento não entra como disponibilidade.
  assert.equal(result.availableRows.length, 2);
  assert.equal(result.receivables, 2000);
  assert.equal(result.payables, 4000);
  assert.equal(result.cardInvoices, 800);
  assert.equal(result.currentAssets, 17000);
  assert.equal(result.currentLiabilities, 4800);
  assert.equal(result.currentRatio, 3.54);
  assert.equal(result.quickRatio, 3.13);
  assert.equal(result.currentStatus, 'saudavel');
  assert.equal(result.quickStatus, 'saudavel');
  assert.equal(result.hasData, true);
  assert.equal(result.notApplicableMessage, null);
});

test('transferência interna não entra como receita nem despesa', () => {
  const accounts = [account(), account({ id: 'acc-savings', name: 'Poupança', type: 'savings', opening_balance: 0 })];
  const transactions = [
    tx({ kind: 'transfer', amount: 3000, account_id: 'acc-check', counterpart_account_id: 'acc-savings' }),
  ];
  const result = buildLiquidity({ accounts, transactions, range: RANGE });

  assert.equal(result.available, 10000);
  assert.equal(result.receivables, 0);
  assert.equal(result.payables, 0);
  assert.equal(result.receivableItems.length, 0);
  assert.equal(result.payableItems.length, 0);
});

test('sem dados suficientes não inventa índice', () => {
  const result = buildLiquidity({ accounts: [], transactions: [], range: RANGE });

  assert.equal(result.hasData, false);
  assert.equal(result.hasAccounts, false);
  assert.equal(result.currentAssets, 0);
  assert.equal(result.currentLiabilities, 0);
  assert.equal(result.currentRatio, null);
  assert.equal(result.quickRatio, null);
  assert.equal(result.currentStatus, 'indefinido');
  assert.equal(result.quickStatus, 'indefinido');
  assert.ok(result.warnings.length > 0);
});

test('passivo circulante igual a zero não gera índice numérico', () => {
  const result = buildLiquidity({ accounts: [account()], transactions: [], range: RANGE });

  assert.equal(result.currentLiabilities, 0);
  assert.equal(result.currentRatio, null);
  assert.equal(result.quickRatio, null);
  assert.equal(result.currentStatus, 'indefinido');
  assert.match(result.notApplicableMessage, /Não aplicável: passivo circulante igual a zero/);
});

test('pagamento parcial entra pelo liquidado e pelo saldo em aberto', () => {
  const transactions = [
    tx({ kind: 'expense', amount: 1000, status: 'pending', settled_amount: 400, due_date: '2026-10-10' }),
  ];
  const result = buildLiquidity({ accounts: [account()], transactions, range: RANGE });

  assert.equal(result.available, 9600);
  assert.equal(result.payables, 600);
  assert.equal(result.payableItems.length, 1);
  assert.equal(result.currentLiabilities, 600);
});

test('compromisso posterior à data de referência fica fora do cálculo', () => {
  const transactions = [
    tx({ kind: 'expense', amount: 500, status: 'pending', settlement_date: null, due_date: '2026-11-15' }),
  ];
  const result = buildLiquidity({ accounts: [account()], transactions, range: RANGE });

  assert.equal(result.payables, 0);
  assert.equal(result.afterReference.payables, 500);
  assert.equal(result.afterReference.count, 1);
});

test('saldo considera apenas o que foi liquidado até a data de referência', () => {
  const transactions = [
    tx({ kind: 'expense', amount: 700, settlement_date: '2026-11-02', due_date: '2026-11-02' }),
  ];
  const result = buildLiquidity({ accounts: [account()], transactions, range: RANGE });

  assert.equal(result.available, 10000);
});

test('lançamento cancelado não altera saldo nem pendências', () => {
  const transactions = [
    tx({ kind: 'expense', amount: 900, status: 'cancelled' }),
    tx({ kind: 'expense', amount: 700, status: 'cancelled', settled_amount: 0, due_date: '2026-10-22' }),
  ];
  const result = buildLiquidity({ accounts: [account()], transactions, range: RANGE });

  assert.equal(result.available, 10000);
  assert.equal(result.payables, 0);
});

test('conta arquivada fica fora das disponibilidades', () => {
  const result = buildLiquidity({
    accounts: [account(), account({ id: 'acc-old', name: 'Conta antiga', archived: true, opening_balance: 5000 })],
    transactions: [],
    range: RANGE,
  });

  assert.equal(result.available, 10000);
  assert.equal(result.availableRows.length, 1);
});

test('status respeita as faixas e o passivo', () => {
  const transactions = [
    tx({ kind: 'expense', amount: 4000, status: 'pending', settlement_date: null, due_date: '2026-10-20' }),
  ];
  const result = buildLiquidity({
    accounts: [account({ opening_balance: 3000 })],
    transactions,
    range: RANGE,
  });

  assert.equal(result.quickRatio, 0.75);
  assert.equal(result.currentRatio, 0.75);
  assert.equal(result.quickStatus, 'atencao');
  assert.equal(result.currentStatus, 'critico');
});

test('classificação de faixas é explícita', () => {
  assert.equal(liquidityStatus(null), 'indefinido');
  assert.equal(liquidityStatus(LIQUIDITY_BANDS.current.healthy), 'saudavel');
  assert.equal(liquidityStatus(LIQUIDITY_BANDS.current.warning), 'atencao');
  assert.equal(liquidityStatus(0.5), 'critico');
});