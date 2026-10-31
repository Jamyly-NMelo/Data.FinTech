/** Carteira de investimentos: posição, custo, rentabilidade e alocação. */

import { percent, round2, safeDivide, toNumber } from './money.js';

export const OPERATION_TYPES = Object.freeze({
  APORTE: 'aporte',
  RESGATE: 'resgate',
  DIVIDENDO: 'dividendo',
  JCP: 'jcp',
  RENDIMENTO: 'rendimento',
});

export const ASSET_CLASSES = [
  { value: 'renda_fixa', label: 'Renda fixa' },
  { value: 'acoes', label: 'Ações' },
  { value: 'fii', label: 'Fundos imobiliários' },
  { value: 'fundos', label: 'Fundos' },
  { value: 'cripto', label: 'Cripto' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'outros', label: 'Outros' },
];

export const assetClassLabel = (value) => ASSET_CLASSES.find((item) => item.value === value)?.label || 'Outros';

export const positionValue = (investment) =>
  round2(Math.abs(toNumber(investment?.quantity)) * toNumber(investment?.current_price));

export const costBasis = (investment) =>
  round2(Math.abs(toNumber(investment?.quantity)) * toNumber(investment?.avg_price));

export const operationAmount = (operation) => {
  const quantity = toNumber(operation?.quantity);
  const price = toNumber(operation?.price);
  const fees = toNumber(operation?.fees);
  const gross = quantity > 0 && price > 0 ? quantity * price : 0;
  return round2(gross + fees);
};

const EARNINGS = [OPERATION_TYPES.DIVIDENDO, OPERATION_TYPES.JCP, OPERATION_TYPES.RENDIMENTO];

/** Métricas de uma posição, usando as operações quando existirem. */
export const investmentMetrics = (investment, operations = []) => {
  const value = positionValue(investment);
  const cost = costBasis(investment);
  const related = operations.filter((operation) => operation.investment_id === investment?.id);

  const contributed = round2(
    related
      .filter((operation) => operation.type === OPERATION_TYPES.APORTE)
      .reduce((total, operation) => total + (operationAmount(operation) || Math.abs(toNumber(operation.amount))), 0),
  );
  const withdrawn = round2(
    related
      .filter((operation) => operation.type === OPERATION_TYPES.RESGATE)
      .reduce((total, operation) => total + (operationAmount(operation) || Math.abs(toNumber(operation.amount))), 0),
  );
  const earnings = round2(
    related
      .filter((operation) => EARNINGS.includes(operation.type))
      .reduce((total, operation) => total + (operationAmount(operation) || Math.abs(toNumber(operation.amount))), 0),
  );

  const basis = contributed > 0 ? contributed : cost;
  const unrealized = round2(value - cost);
  const result = round2(value + withdrawn + earnings - basis);

  return {
    investment,
    value,
    cost,
    contributed,
    withdrawn,
    earnings,
    unrealized,
    unrealizedPercent: percent(unrealized, cost, 2),
    result,
    profitabilityPercent: basis > 0 ? round2(safeDivide(result, basis) * 100) : 0,
    hasOperations: related.length > 0,
    operations: related.sort((a, b) => String(b.date).localeCompare(String(a.date))),
  };
};

export const portfolioSummary = (investments = [], operations = []) => {
  const positions = investments.map((investment) => investmentMetrics(investment, operations));
  const value = round2(positions.reduce((total, item) => total + item.value, 0));
  const cost = round2(positions.reduce((total, item) => total + item.cost, 0));
  const contributed = round2(positions.reduce((total, item) => total + item.contributed, 0));
  const withdrawn = round2(positions.reduce((total, item) => total + item.withdrawn, 0));
  const earnings = round2(positions.reduce((total, item) => total + item.earnings, 0));
  const basis = contributed > 0 ? contributed : cost;
  const result = round2(value + withdrawn + earnings - basis);
  return {
    positions,
    value,
    cost,
    contributed,
    withdrawn,
    earnings,
    unrealized: round2(value - cost),
    unrealizedPercent: percent(value - cost, cost, 2),
    result,
    profitabilityPercent: basis > 0 ? round2(safeDivide(result, basis) * 100) : 0,
  };
};

export const allocationByClass = (investments = []) => {
  const total = round2(investments.reduce((sum, investment) => sum + positionValue(investment), 0));
  const map = new Map();
  investments.forEach((investment) => {
    const key = investment.asset_class || 'outros';
    map.set(key, round2((map.get(key) || 0) + positionValue(investment)));
  });
  return Array.from(map.entries())
    .map(([asset_class, value]) => ({
      asset_class,
      label: assetClassLabel(asset_class),
      value,
      share: percent(value, total, 2),
    }))
    .sort((a, b) => b.value - a.value);
};

export const allocationByInstitution = (investments = []) => {
  const total = round2(investments.reduce((sum, investment) => sum + positionValue(investment), 0));
  const map = new Map();
  investments.forEach((investment) => {
    const key = investment.institution?.trim() || 'Sem instituição';
    map.set(key, round2((map.get(key) || 0) + positionValue(investment)));
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value, share: percent(value, total, 2) }))
    .sort((a, b) => b.value - a.value);
};

/** Proventos recebidos por mês (YYYY-MM). */
export const earningsByMonth = (operations = []) => {
  const map = new Map();
  operations
    .filter((operation) => EARNINGS.includes(operation.type))
    .forEach((operation) => {
      const key = String(operation.date || '').slice(0, 7);
      if (!key) return;
      map.set(key, round2((map.get(key) || 0) + operationAmount(operation)));
    });
  return Array.from(map.entries())
    .map(([month, value]) => ({ month, value }))
    .sort((a, b) => a.month.localeCompare(b.month));
};