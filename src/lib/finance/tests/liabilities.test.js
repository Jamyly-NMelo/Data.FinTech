/**
 * Testes da classificação do passivo (circulante x não circulante).
 * Execução: node --test src/lib/finance/tests/liabilities.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyLiability, liabilitySummary } from '../liabilities.js';

const REFERENCE = '2026-10-29';

const debt = (over = {}) => ({
  id: 'debt-1',
  name: 'Empréstimo',
  outstanding_balance: 1000,
  ...over,
});

test('classificação informada tem prioridade', () => {
  const curto = classifyLiability(debt({ term: 'curto_prazo', maturity_date: '2029-01-01' }), { referenceDate: REFERENCE });
  const longo = classifyLiability(debt({ term: 'longo_prazo', maturity_date: '2026-12-01' }), { referenceDate: REFERENCE });

  assert.equal(curto.bucket, 'current');
  assert.equal(curto.source, 'informada');
  assert.equal(longo.bucket, 'nonCurrent');
  assert.equal(longo.source, 'informada');
});

test('sem classificação, o vencimento decide em 12 meses', () => {
  const dentro = classifyLiability(debt({ maturity_date: '2027-06-30' }), { referenceDate: REFERENCE });
  const fora = classifyLiability(debt({ maturity_date: '2028-06-30' }), { referenceDate: REFERENCE });
  const limite = classifyLiability(debt({ maturity_date: '2027-10-29' }), { referenceDate: REFERENCE });

  assert.equal(dentro.bucket, 'current');
  assert.equal(dentro.source, 'derivada_do_vencimento');
  assert.equal(fora.bucket, 'nonCurrent');
  assert.equal(limite.bucket, 'current');
});

test('dívida vencida é exigível imediato', () => {
  const vencida = classifyLiability(debt({ maturity_date: '2026-01-10' }), { referenceDate: REFERENCE });
  assert.equal(vencida.bucket, 'overdue');
  assert.ok(vencida.reason.includes('Vencida'));
});

test('sem classificação e sem vencimento fica preservada e sinalizada', () => {
  const semDados = classifyLiability(debt(), { referenceDate: REFERENCE });
  assert.equal(semDados.bucket, 'unclassified');
  assert.equal(semDados.source, 'ausente');

  const summary = liabilitySummary([debt()], { referenceDate: REFERENCE });
  assert.equal(summary.unclassifiedTotal, 1000);
  assert.equal(summary.circulating, 0);
  assert.equal(summary.nonCirculating, 0);
  assert.ok(summary.warnings.some((warning) => warning.includes('sem classificação')));
});

test('dívida quitada sai dos totais', () => {
  const quitada = classifyLiability(debt({ outstanding_balance: 0 }), { referenceDate: REFERENCE });
  assert.equal(quitada.bucket, 'settled');

  const summary = liabilitySummary([debt({ outstanding_balance: 0 })], { referenceDate: REFERENCE });
  assert.equal(summary.circulating, 0);
  assert.equal(summary.outstandingTotal, 0);
});

test('resumo separa circulante, não circulante e principal', () => {
  const debts = [
    debt({ id: 'a', outstanding_balance: 1200, principal: 2000, term: 'curto_prazo', future_interest: 300 }),
    debt({ id: 'b', outstanding_balance: 8000, principal: 10000, term: 'longo_prazo', maturity_date: '2030-05-10' }),
    debt({ id: 'c', outstanding_balance: 500, maturity_date: '2026-05-10' }),
  ];

  const summary = liabilitySummary(debts, { referenceDate: REFERENCE });

  assert.equal(summary.circulating, 1700);
  assert.equal(summary.nonCirculating, 8000);
  assert.equal(summary.overdueTotal, 500);
  assert.equal(summary.principalTotal, 12000);
  assert.equal(summary.futureInterestTotal, 300);
  assert.equal(summary.futureInterestCount, 1);
  assert.equal(summary.counts.total, 3);
  assert.ok(summary.warnings.some((warning) => warning.includes('vencida')));
  assert.ok(summary.warnings.some((warning) => warning.includes('juros futuros')));
});

test('juros futuros nunca são estimados', () => {
  const summary = liabilitySummary([debt({ term: 'curto_prazo', annual_interest_rate: 24 })], {
    referenceDate: REFERENCE,
  });

  assert.equal(summary.futureInterestTotal, 0);
  assert.equal(summary.futureInterestCount, 0);
  assert.equal(summary.rows[0].futureInterest, null);
});

test('dívidas antigas sem os campos novos são preservadas', () => {
  const antiga = { id: 'old', name: 'Antiga', outstanding_balance: 300, principal: 400 };
  const summary = liabilitySummary([antiga], { referenceDate: REFERENCE });

  assert.equal(summary.outstandingTotal, 300);
  assert.equal(summary.rows[0].bucket, 'unclassified');
  assert.equal(summary.rows[0].futureInterest, null);
});

test('lista vazia não quebra e zera os totais', () => {
  const summary = liabilitySummary([], { referenceDate: REFERENCE });
  assert.equal(summary.outstandingTotal, 0);
  assert.equal(summary.circulating, 0);
  assert.deepEqual(summary.warnings, []);
});