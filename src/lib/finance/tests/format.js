/** Formatação de valores, datas e percentuais (pt-BR). */

import { toNumber } from '@/lib/finance/money';
import { formatLongDate, toISODate } from '@/lib/finance/periods';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compactFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const plainFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integerFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export const MASKED_VALUE = 'R$ ••••';

export const formatCurrency = (value, { compact = false } = {}) => {
  const amount = toNumber(value);
  if (compact && Math.abs(amount) >= 10000) return compactFormatter.format(amount);
  return currencyFormatter.format(amount);
};

export const formatNumber = (value, { decimals = 2 } = {}) => {
  const amount = toNumber(value);
  return decimals === 0 ? integerFormatter.format(amount) : plainFormatter.format(amount);
};

export const formatPercent = (value, decimals = 2) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
};

export const formatVariation = (value) => {
  if (value === null || value === undefined) return null;
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatPercent(value, 1)}`;
};

export const formatDate = (value) => formatLongDate(value);

export { formatShortDate } from '@/lib/finance/periods';

export const formatMonthLabel = (key) => {
  if (!key) return '—';
  const [year, month] = String(key).split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const index = Number(month) - 1;
  if (!months[index]) return key;
  return `${months[index]}/${String(year).slice(2)}`;
};

export const todayISO = () => toISODate(new Date());

export const toDateInputValue = (value) => toISODate(value) || '';

export const daysUntil = (dateValue) => {
  const iso = toISODate(dateValue);
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
};

export const relativeDueLabel = (dateValue) => {
  const days = daysUntil(dateValue);
  if (days === null) return '—';
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  if (days < 0) return `${Math.abs(days)} dia(s) em atraso`;
  return `Em ${days} dia(s)`;
};