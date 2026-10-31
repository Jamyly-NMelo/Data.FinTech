/**
 * Primitivas numéricas do motor financeiro.
 * Todas as funções são puras e tolerantes a entradas inválidas:
 * valores não numéricos viram 0 e divisões por zero retornam um fallback explícito.
 */

export const toNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const clean = value.trim();
  if (clean === '') return 0;
  const normalized = clean.includes(',')
    ? clean.replace(/\./g, '').replace(',', '.')
    : clean;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const roundTo = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
};

export const round2 = (value) => roundTo(value, 2);

/** Divisão segura: nunca retorna NaN nem Infinity. */
export const safeDivide = (numerator, denominator, fallback = 0) => {
  const divisor = toNumber(denominator);
  if (divisor === 0) return toNumber(fallback);
  const result = toNumber(numerator) / divisor;
  return Number.isFinite(result) ? result : toNumber(fallback);
};

/** Percentual de `part` sobre `whole` (0 quando o total é zero). */
export const percent = (part, whole, decimals = 2) => roundTo(safeDivide(part, whole) * 100, decimals);

/** Variação percentual entre dois valores. Retorna null quando não há base de comparação. */
export const variation = (current, previous, decimals = 2) => {
  const base = toNumber(previous);
  const now = toNumber(current);
  if (base === 0) return now === 0 ? 0 : null;
  return roundTo(((now - base) / Math.abs(base)) * 100, decimals);
};

export const clamp = (value, min, max) => Math.min(Math.max(toNumber(value), min), max);

export const sumBy = (items = [], selector = (item) => item) =>
  round2((Array.isArray(items) ? items : []).reduce((total, item) => total + toNumber(selector(item)), 0));

export const maxBy = (items = [], selector = (item) => item) => {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return null;
  return list.reduce((best, item) => (toNumber(selector(item)) > toNumber(selector(best)) ? item : best), list[0]);
};

export const isValidNumber = (value) => typeof value === 'number' && Number.isFinite(value);