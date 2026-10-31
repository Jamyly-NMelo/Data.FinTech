/**
 * Testes automatizados das regras financeiras.
 * Execução: node --test src/lib/finance/tests/finance.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { percent, round2, safeDivide, sumBy, variation } from '../money.js';
import {
  accountBalance,
  agendaByDay,
  openAmount,
  settledAmount,
  statusLabel,
} from '../ledger.js';
import { previousRange, recentMonths, resolveRange } from '../periods.js';
import {
  categoryBreakdown,
  filterTransactions,
  financialAutonomy,
  monthlyFlow,
  netWorth,
  periodSummary,
  summarize,
} from '../metrics.js';
import { investmentMetrics, portfolioSummary, allocationByClass } from '../investments.js';
import { buildDre } from '../dre.js';
import { budgetStatus, buildBudgets } from '../budget.js';
import { debtTotals, payoffSchedule } from '../debt.js';
import { pricingAnalysis } from '../pricing.js';
import { compareRegimes, estimateSimples } from '../tax.js';
import { buildBackupPayload, parseBackupText, validateBackup } from '../backup.js';

const checking = { id: 'bank', name: 'Conta', type: 'checking', environment: 'pf', opening_balance: 1000 };
const card = { id: 'card', name: 'Cartão', type: 'credit_card', environment: 'pf', opening_balance: 0 };
const savings = { id: 'savings', name: 'Reserva', type: 'savings', environment: 'pf', opening_balance: 0 };

const tx = (over = {}) => ({ status: 'settled', kind: 'expense', amount: 0, environment: 'pf', ...over });

// 1. Saldos
test('saldo da conta considera apenas movimentos liquidados e ajustes válidos', () => {
  const transactions = [
    tx({ id: 't1', kind: 'income', amount: 500, account_id: 'bank', settlement_date: '2026-10-05' }),
    tx({ id: 't2', kind: 'expense', amount: 200, account_id: 'bank', status: 'pending', due_date: '2026-10-20' }),
    tx({ id: 't3', kind: 'expense', amount: 300, account_id: 'bank', settlement_date: '2026-10-10' }),
    tx({ id: 't4', kind: 'expense', amount: 999, account_id: 'bank', status: 'cancelled' }),
  ];
  assert.equal(accountBalance(checking, transactions), 1200);
});

test('pendência entra apenas na projeção, nunca no saldo', () => {
  const transactions = [tx({ kind: 'income', amount: 400, account_id: 'bank', status: 'pending', due_date: '2026-11-01' })];
  assert.equal(accountBalance(checking, transactions), 1000);
  assert.equal(openAmount(transactions[0]), 400);
});

test('saldo pode ser lido em uma data passada (até)', () => {
  const transactions = [
    tx({ kind: 'income', amount: 100, account_id: 'bank', settlement_date: '2026-10-05' }),
    tx({ kind: 'income', amount: 100, account_id: 'bank', settlement_date: '2026-11-05' }),
  ];
  assert.equal(accountBalance(checking, transactions, { until: '2026-10-31' }), 1100);
  assert.equal(accountBalance(checking, transactions), 1200);
});

// 2. Transferências internas
test('transferência interna não cria receita nem despesa', () => {
  const transactions = [
    tx({ kind: 'transfer', amount: 400, account_id: 'bank', counterpart_account_id: 'savings', settlement_date: '2026-10-02' }),
  ];
  const summary = summarize(transactions);
  assert.equal(summary.income, 0);
  assert.equal(summary.expense, 0);
  assert.equal(summary.result, 0);
  assert.equal(summary.transferVolume, 400);
  assert.equal(accountBalance(checking, transactions), 600);
  assert.equal(accountBalance(savings, transactions), 400);
  assert.equal(accountBalance(checking, transactions) + accountBalance(savings, transactions), 1000);
});

test('resultado consolidado desconsidera transferências mesmo com receitas reais', () => {
  const transactions = [
    tx({ kind: 'income', amount: 1000, account_id: 'bank', settlement_date: '2026-10-01' }),
    tx({ kind: 'transfer', amount: 500, account_id: 'bank', counterpart_account_id: 'savings', settlement_date: '2026-10-02' }),
  ];
  const summary = summarize(transactions);
  assert.equal(summary.income, 1000);
  assert.equal(summary.expense, 0);
  assert.equal(summary.result, 1000);
});

// 3. Cartão de crédito
test('compra no cartão e pagamento da fatura não duplicam a despesa', () => {
  const transactions = [
    tx({ kind: 'expense', amount: 1200, account_id: 'card', settlement_date: '2026-10-03' }),
    tx({ kind: 'transfer', amount: 1200, account_id: 'bank', counterpart_account_id: 'card', settlement_date: '2026-10-15' }),
  ];
  const summary = summarize(transactions);
  assert.equal(summary.expense, 1200, 'a fatura paga não pode virar uma segunda despesa');
  assert.equal(summary.result, -1200);
  assert.equal(accountBalance(card, transactions), 0, 'o cartão zera quando a fatura é paga');
  assert.equal(accountBalance(checking, transactions), -200);
});

test('fatura em aberto aparece como passivo', () => {
  const transactions = [tx({ kind: 'expense', amount: 800, account_id: 'card', settlement_date: '2026-10-03' })];
  const position = netWorth([checking, card], transactions, []);
  assert.equal(position.liabilities, 800);
  assert.equal(position.equity, 200);
});

// 4. Parciais e status
test('pagamento parcial conta o valor liquidado e mantém o restante em aberto', () => {
  const partial = tx({ kind: 'expense', amount: 1000, account_id: 'bank', status: 'pending', settled_amount: 400 });
  assert.equal(settledAmount(partial), 400);
  assert.equal(openAmount(partial), 600);
  assert.equal(statusLabel(partial), 'Parcial');
  assert.equal(accountBalance(checking, [partial]), 600);
});

test('lançamento cancelado não afeta saldo nem resultado', () => {
  const cancelled = tx({ kind: 'expense', amount: 500, account_id: 'bank', status: 'cancelled' });
  assert.equal(settledAmount(cancelled), 0);
  assert.equal(openAmount(cancelled), 0);
  assert.equal(accountBalance(checking, [cancelled]), 1000);
  assert.equal(summarize([cancelled]).expense, 0);
});

// 5. Robustez numérica
test('divisões por zero e entradas inválidas não geram NaN', () => {
  assert.equal(safeDivide(10, 0), 0);
  assert.equal(safeDivide(10, 0, -1), -1);
  assert.equal(percent(5, 0), 0);
  assert.equal(summarize([tx({ kind: 'income', amount: 0 })]).margin, 0);
  assert.equal(accountBalance(checking, [tx({ kind: 'expense', amount: 'abc', account_id: 'bank' })]), 1000);
  assert.equal(variation(100, 0), null, 'sem base de comparação');
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(sumBy([{ v: 1.005 }, { v: 2.005 }], (item) => item.v), 3.01);
});

// 6. Comparação e filtros
test('filtros por contexto, conta, categoria e status', () => {
  const rows = [
    tx({ id: 'a', kind: 'expense', amount: 10, account_id: 'bank', environment: 'pf', category_id: 'c1' }),
    tx({ id: 'b', kind: 'expense', amount: 20, account_id: 'bank', environment: 'pj', category_id: 'c1' }),
    tx({ id: 'c', kind: 'expense', amount: 30, account_id: 'card', environment: 'pf', category_id: 'c2', status: 'pending' }),
  ];
  assert.equal(filterTransactions(rows, { environment: 'pf' }).length, 2);
  assert.equal(filterTransactions(rows, { environment: 'consolidado' }).length, 3);
  assert.equal(filterTransactions(rows, { categoryId: 'c2' }).length, 1);
  assert.equal(filterTransactions(rows, { status: 'pending' }).length, 1);
  assert.equal(filterTransactions(rows, { accountId: 'bank' }).length, 2);
});

test('comparação com o período anterior usa janela de mesma duração', () => {
  const current = resolveRange('current_month', {}, new Date(2026, 9, 27));
  const previous = previousRange(current);
  assert.equal(current.from, '2026-10-01');
  assert.equal(current.to, '2026-10-31');
  assert.equal(previous.from, '2026-09-01');
  assert.equal(previous.to, '2026-09-30');

  const transactions = [
    tx({ kind: 'income', amount: 1000, account_id: 'bank', settlement_date: '2026-10-10' }),
    tx({ kind: 'expense', amount: 400, account_id: 'bank', settlement_date: '2026-10-11' }),
    tx({ kind: 'income', amount: 500, account_id: 'bank', settlement_date: '2026-09-10' }),
  ];
  const result = periodSummary(transactions, current, previous);
  assert.equal(result.current.result, 600);
  assert.equal(result.previous.result, 500);
  assert.equal(result.comparison.result, 20);
  assert.equal(result.comparison.income, 100);
});

// 7. Fluxo mensal, categorias e autonomia
test('fluxo mensal agrega entradas e saídas por mês', () => {
  const transactions = [
    tx({ kind: 'income', amount: 2000, account_id: 'bank', settlement_date: '2026-10-05' }),
    tx({ kind: 'expense', amount: 500, account_id: 'bank', settlement_date: '2026-10-06' }),
    tx({ kind: 'expense', amount: 300, account_id: 'bank', settlement_date: '2026-11-06' }),
    tx({ kind: 'transfer', amount: 900, account_id: 'bank', counterpart_account_id: 'savings', settlement_date: '2026-10-07' }),
  ];
  const flow = monthlyFlow(transactions, 12);
  const october = flow.find((row) => row.month === '2026-10');
  assert.equal(october.income, 2000);
  assert.equal(october.expense, 500);
  assert.equal(october.result, 1500);
  assert.equal(october.transferVolume, 900);
  assert.equal(flow.length, 12);
});

test('distribuição de despesas por categoria soma 100% e ignora transferências', () => {
  const categories = [
    { id: 'c1', name: 'Moradia' },
    { id: 'c2', name: 'Alimentação' },
  ];
  const transactions = [
    tx({ kind: 'expense', amount: 750, account_id: 'bank', category_id: 'c1' }),
    tx({ kind: 'expense', amount: 250, account_id: 'bank', category_id: 'c2' }),
    tx({ kind: 'transfer', amount: 5000, account_id: 'bank', counterpart_account_id: 'savings' }),
    tx({ kind: 'expense', amount: 100, account_id: 'bank', category_id: 'removida' }),
  ];
  const breakdown = categoryBreakdown(transactions, categories);
  const totalShare = round2(breakdown.reduce((sum, row) => sum + row.share, 0));
  assert.equal(totalShare, 100);
  assert.equal(breakdown[0].name, 'Moradia');
  assert.equal(breakdown.find((row) => row.category_id === 'removida').name, 'Categoria removida');
});

test('autonomia financeira é nula quando não há despesa como base', () => {
  assert.equal(financialAutonomy(5000, []).months, null);
  const autonomy = financialAutonomy(9000, [
    tx({ kind: 'expense', amount: 3000, account_id: 'bank', settlement_date: new Date().toISOString().slice(0, 10) }),
  ]);
  assert.equal(autonomy.months, 9);
});

// 8. Patrimônio
test('patrimônio soma caixa, carteira e subtrai passivos', () => {
  const investments = [{ id: 'i1', quantity: 10, current_price: 100, avg_price: 80 }];
  const transactions = [tx({ kind: 'expense', amount: 1200, account_id: 'card', settlement_date: '2026-10-03' })];
  const position = netWorth([checking, card, savings], transactions, investments);
  assert.equal(position.cash, 1000);
  assert.equal(position.portfolio, 1000);
  assert.equal(position.liabilities, 1200);
  assert.equal(position.equity, 800);
});

// 9. Agenda
test('agenda agrupa pendências por dia e separa entradas de saídas', () => {
  const today = new Date(2026, 9, 27);
  const transactions = [
    tx({ kind: 'expense', amount: 100, account_id: 'bank', status: 'pending', due_date: '2026-10-28' }),
    tx({ kind: 'income', amount: 250, account_id: 'bank', status: 'pending', due_date: '2026-10-28' }),
    tx({ kind: 'expense', amount: 200, account_id: 'bank', status: 'pending', due_date: '2026-11-20' }),
  ];
  const agenda = agendaByDay(transactions, { from: '2026-10-27', to: '2026-11-06' });
  assert.equal(agenda.length, 1);
  assert.equal(agenda[0].date, '2026-10-28');
  assert.equal(agenda[0].inflow, 250);
  assert.equal(agenda[0].outflow, 100);
  assert.equal(agenda[0].net, 150);
  assert.ok(today instanceof Date);
});

// 10. Investimentos
test('rentabilidade da posição usa aportes, resgates e proventos', () => {
  const investment = { id: 'inv1', quantity: 100, avg_price: 10, current_price: 12 };
  const operations = [
    { investment_id: 'inv1', type: 'aporte', quantity: 100, price: 10, fees: 0, date: '2026-01-10' },
    { investment_id: 'inv1', type: 'dividendo', quantity: 0, price: 0, fees: 0, date: '2026-06-10', amount: 50 },
  ];
  const metrics = investmentMetrics(investment, operations);
  assert.equal(metrics.value, 1200);
  assert.equal(metrics.cost, 1000);
  assert.equal(metrics.earnings, 50);
  assert.equal(metrics.result, 250);
  assert.equal(metrics.profitabilityPercent, 25);
});

test('alocação por classe fecha em 100%', () => {
  const investments = [
    { id: 'i1', quantity: 1, current_price: 700, asset_class: 'acoes' },
    { id: 'i2', quantity: 1, current_price: 300, asset_class: 'renda_fixa' },
  ];
  const allocation = allocationByClass(investments);
  assert.equal(round2(allocation.reduce((sum, row) => sum + row.share, 0)), 100);
  assert.equal(allocation[0].asset_class, 'acoes');
  const summary = portfolioSummary(investments, []);
  assert.equal(summary.value, 1000);
});

// 11. DRE
test('DRE simplificado monta as linhas a partir das categorias', () => {
  const categories = [
    { id: 'r1', name: 'Vendas', kind: 'income', group: 'receita' },
    { id: 'e1', name: 'Insumos', kind: 'expense', group: 'custos' },
    { id: 'e2', name: 'Aluguel', kind: 'expense', group: 'operacional' },
    { id: 'e3', name: 'Pró-labore', kind: 'expense', group: 'prolabore' },
  ];
  const transactions = [
    tx({ kind: 'income', amount: 10000, account_id: 'bank', environment: 'pj', category_id: 'r1' }),
    tx({ kind: 'expense', amount: 3000, account_id: 'bank', environment: 'pj', category_id: 'e1' }),
    tx({ kind: 'expense', amount: 2000, account_id: 'bank', environment: 'pj', category_id: 'e2' }),
    tx({ kind: 'expense', amount: 1000, account_id: 'bank', environment: 'pj', category_id: 'e3' }),
    tx({ kind: 'expense', amount: 500, account_id: 'bank', environment: 'pf', category_id: 'e2' }),
  ];
  const dre = buildDre({ transactions, categories, environment: 'pj' });
  assert.equal(dre.totals.receita, 10000);
  assert.equal(dre.margemContribuicao, 7000);
  assert.equal(dre.resultadoOperacional, 5000);
  assert.equal(dre.resultadoLiquido, 4000);
  assert.equal(dre.margemLiquidaPercent, 40);
});

test('DRE sinaliza categorias inexistentes sem quebrar o cálculo', () => {
  const dre = buildDre({
    transactions: [tx({ kind: 'expense', amount: 100, account_id: 'bank', environment: 'pj', category_id: 'nao-existe' })],
    categories: [],
    environment: 'pj',
  });
  assert.equal(dre.totals.nao_classificado, 100);
  assert.ok(dre.warnings.length >= 1);
});

// 12. Orçamento
test('orçamento calcula usado, restante e estouro', () => {
  const ok = budgetStatus({ amount: 1000, alert_percent: 80 }, 400);
  assert.equal(ok.usedPercent, 40);
  assert.equal(ok.remaining, 600);
  assert.equal(ok.status, 'ok');

  const over = budgetStatus({ amount: 1000, alert_percent: 80 }, 1200);
  assert.equal(over.status, 'estourado');
  assert.equal(over.remaining, -200);

  const unlimited = budgetStatus({ amount: 0 }, 10);
  assert.equal(unlimited.usedPercent, 100);
});

test('orçamento por categoria usa apenas despesas liquidadas do mês', () => {
  const budgets = [{ id: 'b1', category_id: 'c1', month: '2026-10', amount: 500, environment: 'pf' }];
  const transactions = [
    tx({ kind: 'expense', amount: 200, account_id: 'bank', category_id: 'c1', settlement_date: '2026-10-05' }),
    tx({ kind: 'expense', amount: 300, account_id: 'bank', category_id: 'c1', settlement_date: '2026-09-05' }),
    tx({ kind: 'expense', amount: 150, account_id: 'bank', category_id: 'c1', status: 'pending', due_date: '2026-10-20' }),
  ];
  const rows = buildBudgets({ budgets, transactions, categories: [{ id: 'c1', name: 'Mercado' }], month: '2026-10', environment: 'pf' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].spent, 200);
});

// 13. Dívidas
test('simulação de quitação calcula prazo e juros', () => {
  const simulation = payoffSchedule({ outstanding_balance: 1000, annual_interest_rate: 12, installment_amount: 200 });
  assert.equal(simulation.impossible, false);
  assert.ok(simulation.months >= 5 && simulation.months <= 6);
  assert.ok(simulation.totalInterest > 0);
  const last = simulation.schedule[simulation.schedule.length - 1];
  assert.equal(last.balance, 0);
});

test('dívida impagável é sinalizada em vez de retornar valores falsos', () => {
  const stuck = payoffSchedule({ outstanding_balance: 1000, annual_interest_rate: 24, installment_amount: 15 });
  assert.equal(stuck.impossible, true);
  assert.equal(stuck.months, null);
  const quitada = payoffSchedule({ outstanding_balance: 0, annual_interest_rate: 10, installment_amount: 100 });
  assert.equal(quitada.months, 0);
  const totals = debtTotals([{ principal: 1000, outstanding_balance: 400, annual_interest_rate: 12, installment_amount: 200 }]);
  assert.equal(totals.outstanding, 400);
  assert.equal(totals.avgRate, 12);
});

// 14. Precificação
test('preço sugerido respeita margem, impostos e comissão', () => {
  const analysis = pricingAnalysis({
    variable_cost: 60,
    fixed_cost_monthly: 0,
    tax_percent: 10,
    commission_percent: 5,
    desired_margin_percent: 25,
    current_price: 0,
    expected_monthly_units: 100,
  });
  assert.equal(analysis.suggestedPrice, 100);
  assert.equal(analysis.marginPercent, 25);
  assert.equal(analysis.markupPercent, 66.67);
  assert.equal(analysis.valid, true);
});

test('percentuais incompatíveis são recusados com alerta', () => {
  const analysis = pricingAnalysis({
    variable_cost: 50,
    tax_percent: 60,
    commission_percent: 30,
    desired_margin_percent: 20,
    current_price: 0,
  });
  assert.equal(analysis.valid, false);
  assert.equal(analysis.suggestedPrice, null);
  assert.ok(analysis.alerts.length >= 1);
});

test('ponto de equilíbrio e lucro mensal usam o preço praticado', () => {
  const analysis = pricingAnalysis({
    variable_cost: 40,
    fixed_cost_monthly: 2000,
    tax_percent: 0,
    commission_percent: 0,
    desired_margin_percent: 0,
    current_price: 100,
    expected_monthly_units: 50,
  });
  assert.equal(analysis.contributionMargin, 60);
  assert.equal(analysis.breakEvenUnits, 34);
  assert.equal(analysis.monthlyProfit, 1000);
});

// 15. Tributos
test('Simples Nacional aplica alíquota efetiva da faixa', () => {
  const estimate = estimateSimples({ monthly_revenue: 25000, annual_revenue: 300000, service_annex: 'I', activity: 'comercio' });
  assert.equal(estimate.effectiveRate, 5.32);
  assert.equal(estimate.monthlyTax, 1330);
  const semReceita = estimateSimples({ monthly_revenue: 0, annual_revenue: 0 });
  assert.equal(semReceita.insufficient, true);
  assert.equal(semReceita.monthlyTax, 0);
});

test('comparação de regimes indica o menor custo estimado', () => {
  const comparison = compareRegimes({
    monthly_revenue: 30000,
    annual_revenue: 360000,
    activity: 'servicos',
    service_annex: 'III',
    profit_margin_percent: 20,
    iss_percent: 5,
  });
  assert.ok(comparison.estimates.length >= 3);
  assert.ok(comparison.best);
  assert.ok(comparison.disclaimer.includes('Simulação'));
  comparison.estimates.forEach((estimate) => {
    assert.ok(Number.isFinite(estimate.monthlyTax));
  });
});

// 16. Backup
test('backup válido é aceito e resumido na prévia', () => {
  const payload = buildBackupPayload({
    Account: [{ ...checking, id: 'bank' }],
    Transaction: [
      { id: 't1', description: 'Salário', kind: 'income', amount: 5000, account_id: 'bank', status: 'settled', settlement_date: '2026-10-05' },
      { id: 't2', description: 'Aluguel', kind: 'expense', amount: 1500, account_id: 'bank', status: 'settled', settlement_date: '2026-10-06' },
    ],
  });
  const result = validateBackup(payload);
  assert.equal(result.ok, true, result.errors.join(' | '));
  assert.equal(result.preview.totals.income, 5000);
  assert.equal(result.preview.totals.result, 3500);
  assert.equal(result.preview.period.from, '2026-10-05');
  assert.equal(result.data.Transaction[0].__source_id, 't1');
});

test('importação inválida é recusada sem alterar dados existentes', () => {
  const futureVersion = validateBackup({ format_version: 99, app: 'data-fintech', data: {} });
  assert.equal(futureVersion.ok, false);
  assert.equal(futureVersion.data, null);

  const brokenReference = validateBackup({
    format_version: 1,
    app: 'data-fintech',
    data: { Account: [], Transaction: [{ id: 'x', description: 'Teste', kind: 'expense', amount: 10, account_id: 'inexistente' }] },
  });
  assert.equal(brokenReference.ok, false);
  assert.ok(brokenReference.errors.some((message) => message.includes('referência')));

  const invalidEnum = validateBackup({
    format_version: 1,
    app: 'data-fintech',
    data: { Transaction: [{ id: 'y', description: 'Teste', kind: 'aporte', amount: 10 }] },
  });
  assert.equal(invalidEnum.ok, false);

  const invalidDate = validateBackup({
    format_version: 1,
    app: 'data-fintech',
    data: { Goal: [{ id: 'g1', name: 'Reserva', target_amount: 1000, deadline: '31/12/2026' }] },
  });
  assert.equal(invalidDate.ok, false);

  const malformed = parseBackupText('{ nao é json }');
  assert.equal(malformed.ok, false);
  assert.match(malformed.errors[0], /JSON válido/);
});

test('backup remove identificadores internos na leitura e preserva a ordem dos meses', () => {
  const payload = buildBackupPayload({ Transaction: [
    { id: 'a', description: 'A', kind: 'expense', amount: 10, created_by_id: 'usuario-1', status: 'settled', settlement_date: '2026-01-10' },
    { id: 'b', description: 'B', kind: 'expense', amount: 10, status: 'settled', settlement_date: '2026-02-10' },
  ] });
  const result = validateBackup(payload);
  assert.equal(result.ok, true);
  assert.equal(result.data.Transaction[0].created_by_id, undefined);
  assert.deepEqual(result.preview.months, ['2026-01', '2026-02']);
  assert.ok(recentMonths(3, new Date(2026, 9, 27)).includes('2026-10'));
});