/** Utilitários de período e datas (YYYY-MM-DD) sem dependências externas. */

export const parseISODate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const toISODate = (value) => {
  const date = parseISODate(value instanceof Date ? value : parseISODate(value));
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const startOfMonth = (value) => {
  const date = parseISODate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const endOfMonth = (value) => {
  const date = parseISODate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

export const addMonths = (value, amount) => {
  const date = parseISODate(value) || new Date();
  return new Date(date.getFullYear(), date.getMonth() + amount, Math.min(date.getDate(), 28));
};

export const addDays = (value, amount) => {
  const date = parseISODate(value) || new Date();
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + amount);
  return next;
};

export const daysBetween = (from, to) => {
  const start = parseISODate(from);
  const end = parseISODate(to);
  if (!start || !end) return 0;
  return Math.round((end - start) / 86400000);
};

export const monthKey = (value) => {
  const date = parseISODate(value);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const monthLabel = (key) => {
  const date = parseISODate(`${key}-01`);
  if (!date) return key;
  return `${MONTHS_SHORT[date.getMonth()]}/${String(date.getFullYear()).slice(2)}`;
};

export const formatShortDate = (value) => {
  const date = parseISODate(value);
  if (!date) return '—';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const formatLongDate = (value) => {
  const date = parseISODate(value);
  if (!date) return '—';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

/** Comparação por string ISO — inclusive quando from/to são nulos (sem limite). */
export const inRange = (value, range) => {
  if (!range) return true;
  const iso = toISODate(value);
  if (!iso) return false;
  if (range.from && iso < range.from) return false;
  if (range.to && iso > range.to) return false;
  return true;
};

export const RANGE_OPTIONS = [
  { value: 'current_month', label: 'Mês atual' },
  { value: 'previous_month', label: 'Mês anterior' },
  { value: 'last_3_months', label: 'Últimos 3 meses' },
  { value: 'last_12_months', label: 'Últimos 12 meses' },
  { value: 'current_year', label: 'Ano atual' },
  { value: 'all', label: 'Todo o período' },
  { value: 'custom', label: 'Personalizado' },
];

export const resolveRange = (preset = 'current_month', custom = {}, reference = new Date()) => {
  const ref = parseISODate(reference) || new Date();
  switch (preset) {
    case 'previous_month': {
      const from = startOfMonth(addMonths(ref, -1));
      const to = endOfMonth(addMonths(ref, -1));
      return { key: preset, from: toISODate(from), to: toISODate(to), label: 'Mês anterior', months: 1 };
    }
    case 'last_3_months': {
      const from = startOfMonth(addMonths(ref, -2));
      return { key: preset, from: toISODate(from), to: toISODate(endOfMonth(ref)), label: 'Últimos 3 meses', months: 3 };
    }
    case 'last_12_months': {
      const from = startOfMonth(addMonths(ref, -11));
      return { key: preset, from: toISODate(from), to: toISODate(endOfMonth(ref)), label: 'Últimos 12 meses', months: 12 };
    }
    case 'current_year': {
      const from = new Date(ref.getFullYear(), 0, 1);
      const to = new Date(ref.getFullYear(), 11, 31);
      return { key: preset, from: toISODate(from), to: toISODate(to), label: `Ano ${ref.getFullYear()}`, months: 12 };
    }
    case 'all':
      return { key: preset, from: null, to: null, label: 'Todo o período', months: 0 };
    case 'custom': {
      const from = toISODate(custom.from);
      const to = toISODate(custom.to);
      return {
        key: preset,
        from,
        to,
        label: from && to ? `${formatLongDate(from)} a ${formatLongDate(to)}` : 'Período personalizado',
        months: 0,
      };
    }
    case 'current_month':
    default: {
      const from = startOfMonth(ref);
      const to = endOfMonth(ref);
      return { key: 'current_month', from: toISODate(from), to: toISODate(to), label: 'Mês atual', months: 1 };
    }
  }
};

/**
 * Janela imediatamente anterior.
 * Presets por mês comparam com o mesmo número de meses anteriores
 * (mês anterior, trimestre anterior…); períodos livres usam a mesma
 * quantidade de dias.
 */
export const previousRange = (range) => {
  if (!range) return null;
  const months = Number(range.months) || 0;
  if (months > 0 && range.from && range.to) {
    const from = startOfMonth(addMonths(parseISODate(range.from), -months));
    const to = endOfMonth(addMonths(parseISODate(range.to), -months));
    return { key: 'previous', from: toISODate(from), to: toISODate(to), label: 'Período anterior', months };
  }
  if (!range.from || !range.to) return null;
  const length = daysBetween(range.from, range.to) + 1;
  const to = addDays(range.from, -1);
  const from = addDays(to, -(length - 1));
  return { key: 'previous', from: toISODate(from), to: toISODate(to), label: 'Período anterior', months: 0 };
};

/** Últimos `count` meses (incluindo o atual) como chaves YYYY-MM. */
export const recentMonths = (count = 6, reference = new Date()) => {
  const ref = parseISODate(reference) || new Date();
  const months = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    months.push(monthKey(startOfMonth(addMonths(ref, -index))));
  }
  return months;
};