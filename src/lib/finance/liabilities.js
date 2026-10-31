/**
 * Classificação do passivo: circulante x não circulante.
 *
 * Regras
 *  - A classificação informada pelo usuário tem prioridade (`term`).
 *  - Sem classificação informada, o vencimento decide: até 12 meses da data de
 *    referência é circulante; acima disso, não circulante.
 *  - Sem classificação e sem vencimento, a dívida fica preservada e sinalizada
 *    como não classificada — nunca é estimada.
 *  - Dívida vencida é passivo circulante (exigível imediato).
 *  - Principal e juros futuros ficam separados e só aparecem quando informados;
 *    nenhum cronograma de amortização é estimado aqui.
 *
 * A entidade Debt não entra no cálculo de liquidez (liquidity.js) para não
 * duplicar o mesmo compromisso já lançado como conta a pagar.
 */

import { round2, toNumber } from './money.js';
import { parseISODate, toISODate } from './periods.js';

/** Limite de 12 meses exato (sem o ajuste de 28 dias de addMonths). */
const oneYearAhead = (isoDate) => {
  const date = parseISODate(isoDate);
  if (!date) return null;
  return toISODate(new Date(date.getFullYear() + 1, date.getMonth(), date.getDate()));
};

export const DEBT_TERMS = Object.freeze([
  { value: 'curto_prazo', label: 'Curto prazo (até 12 meses)' },
  { value: 'longo_prazo', label: 'Longo prazo (acima de 12 meses)' },
  { value: 'nao_classificado', label: 'Não classificada' },
]);

export const LIABILITY_BUCKETS = Object.freeze({
  overdue: 'Vencida',
  current: 'Passivo circulante',
  nonCurrent: 'Passivo não circulante',
  unclassified: 'Não classificada',
  settled: 'Quitada',
});

export const DEFAULT_REFERENCE_DATE = () => toISODate(new Date());

const referenceOf = (value) => toISODate(value) || DEFAULT_REFERENCE_DATE();

/** Classifica uma dívida em um dos grupos do passivo. */
export const classifyLiability = (debt = {}, { referenceDate } = {}) => {
  const reference = referenceOf(referenceDate);
  const outstanding = round2(Math.abs(toNumber(debt.outstanding_balance)));
  const maturity = toISODate(debt.maturity_date);
  const term = DEBT_TERMS.some((item) => item.value === debt.term) ? debt.term : 'nao_classificado';

  if (outstanding <= 0) {
    return { bucket: 'settled', term, maturityDate: maturity, source: term === 'nao_classificado' ? 'ausente' : 'informada', reason: 'Saldo devedor zerado.' };
  }

  if (maturity && maturity < reference) {
    return {
      bucket: 'overdue',
      term,
      maturityDate: maturity,
      source: term === 'nao_classificado' ? 'derivada_do_vencimento' : 'informada',
      reason: `Vencida em ${maturity} — exigível imediato, portanto circulante.`,
    };
  }

  if (term === 'curto_prazo') {
    return { bucket: 'current', term, maturityDate: maturity, source: 'informada', reason: 'Classificada como curto prazo.' };
  }
  if (term === 'longo_prazo') {
    return { bucket: 'nonCurrent', term, maturityDate: maturity, source: 'informada', reason: 'Classificada como longo prazo.' };
  }
  if (maturity) {
    const limit = oneYearAhead(reference);
    const isCurrent = maturity <= limit;
    return {
      bucket: isCurrent ? 'current' : 'nonCurrent',
      term,
      maturityDate: maturity,
      source: 'derivada_do_vencimento',
      reason: `Sem classificação informada: vencimento em ${maturity} ${
        isCurrent ? `dentro de` : `após`
      } 12 meses da data de referência.`,
    };
  }

  return {
    bucket: 'unclassified',
    term,
    maturityDate: null,
    source: 'ausente',
    reason: 'Sem classificação e sem data de vencimento — preserve o registro e classifique para entrar no passivo.',
  };
};

const futureInterestOf = (debt) => {
  const value = toNumber(debt.future_interest);
  return value > 0 ? round2(value) : null;
};

/** Totais do passivo, separando curto e longo prazo e sinalizando pendências. */
export const liabilitySummary = (debts = [], { referenceDate } = {}) => {
  const reference = referenceOf(referenceDate);
  const list = (debts || []).map((debt) => {
    const classification = classifyLiability(debt, { referenceDate: reference });
    const principal = round2(Math.abs(toNumber(debt.principal)));
    const outstanding = round2(Math.abs(toNumber(debt.outstanding_balance)));
    return {
      debt,
      ...classification,
      outstanding,
      principal,
      futureInterest: futureInterestOf(debt),
    };
  });

  const sum = (rows) => round2(rows.reduce((total, row) => total + row.outstanding, 0));
  const overdue = list.filter((row) => row.bucket === 'overdue');
  const current = list.filter((row) => row.bucket === 'current' || row.bucket === 'overdue');
  const nonCurrent = list.filter((row) => row.bucket === 'nonCurrent');
  const unclassified = list.filter((row) => row.bucket === 'unclassified');
  const futureInterestRows = list.filter((row) => row.futureInterest !== null);

  const warnings = [];
  if (unclassified.length > 0) {
    warnings.push(
      `${unclassified.length} dívida(s) sem classificação e sem vencimento: continuam preservadas, mas fora do passivo circulante e não circulante.`,
    );
  }
  if (overdue.length > 0) {
    warnings.push(`${overdue.length} dívida(s) vencida(s), somando ${overdue.length ? sum(overdue).toFixed(2) : '0'} em saldo devedor.`);
  }
  const missingInterest = list.filter((row) => row.outstanding > 0 && row.futureInterest === null).length;
  if (missingInterest > 0) {
    warnings.push(`${missingInterest} dívida(s) sem juros futuros informados — nenhum valor foi estimado.`);
  }

  return {
    referenceDate: reference,
    rows: list,
    overdue,
    current,
    nonCurrent,
    unclassified,
    circulating: sum(current),
    nonCirculating: sum(nonCurrent),
    overdueTotal: sum(overdue),
    unclassifiedTotal: sum(unclassified),
    outstandingTotal: sum(list),
    principalTotal: round2(list.reduce((total, row) => total + row.principal, 0)),
    futureInterestTotal: round2(futureInterestRows.reduce((total, row) => total + row.futureInterest, 0)),
    futureInterestCount: futureInterestRows.length,
    counts: {
      total: list.length,
      current: current.length,
      nonCurrent: nonCurrent.length,
      overdue: overdue.length,
      unclassified: unclassified.length,
    },
    warnings,
  };
};