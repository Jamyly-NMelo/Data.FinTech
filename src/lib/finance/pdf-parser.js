const DATE_PATTERN = /\b\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\b/;
const AMOUNT_PATTERN = /(?:\(\s*)?-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}\s*(?:CR)?\s*-?\s*\)?/gi;
const TRANSACTION_AMOUNT_PATTERN = /(?:\(\s*)?-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}\s*(?:CR)?\s*-?\s*\)?/i;
const SUMMARY_LINE_PATTERN = /\b(pagamento\s+(?:efetuado|realizado)|saldo\s+anterior|total\s+(?:desta|da)\s+fatura|total\s+a\s+pagar|pagamento\s+m[ií]nimo|limite\s+(?:dispon[ií]vel|total)|melhor\s+dia|encargos\s+totais|resumo\s+da\s+fatura)\b/i;
const normalizeText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const parseAmountToken = (token) => {
  const negative =
    /\bCR\b/i.test(token) ||
    /^\s*[\(-]/.test(token) ||
    /-\s*\)?\s*$/.test(token);
  const numeric = token.replace(/\bCR\b/gi, '').replace(/[^\d,]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? (negative ? -1 : 1) * Math.abs(parsed) : null;
};

const amountTokens = (line) => String(line).match(new RegExp(AMOUNT_PATTERN.source, 'gi')) || [];

const validDateParts = (day, month, year) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const dateFromToken = (token, referenceDate) => {
  const [, dayText, monthText, yearText] = /^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?$/.exec(token) || [];
  if (!dayText || !monthText) return null;
  const day = Number(dayText);
  const month = Number(monthText);
  if (yearText) {
    const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);
    if (!validDateParts(day, month, year)) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  if (!referenceDate) return null;
  const referenceYear = Number(referenceDate.slice(0, 4));
  const candidates = [referenceYear - 1, referenceYear, referenceYear + 1]
    .filter((year) => validDateParts(day, month, year))
    .map((year) => ({
      year,
      distance: Math.abs(Date.UTC(year, month - 1, day) - Date.parse(`${referenceDate}T00:00:00Z`)),
    }))
    .sort((left, right) => left.distance - right.distance);
  const year = candidates[0]?.year;
  return year ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
};

const labelledValue = (lines, labelPattern) => {
  for (const line of lines) {
    if (!labelPattern.test(normalizeText(line))) continue;
    const tokens = amountTokens(line);
    if (tokens.length) return parseAmountToken(tokens[tokens.length - 1]);
  }
  return null;
};

const labelledDate = (lines, labelPattern) => {
  for (const line of lines) {
    if (!labelPattern.test(normalizeText(line))) continue;
    const match = line.match(DATE_PATTERN);
    if (match) return match[0];
  }
  return null;
};

const itemFromLine = (line, referenceDate, descriptionPrefix = null) => {
  if (SUMMARY_LINE_PATTERN.test(normalizeText(line))) return null;
  const dateToken = line.match(DATE_PATTERN)?.[0];
  const amounts = amountTokens(line);
  if (!dateToken || !amounts.length) return null;
  const amount = parseAmountToken(amounts[amounts.length - 1]);
  if (amount === null) return null;

  let description = line
    .replace(DATE_PATTERN, ' ')
    .replace(new RegExp(AMOUNT_PATTERN.source, 'gi'), ' ')
    .replace(/\bCR\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s|•*-]+|[\s|•*-]+$/g, '')
    .trim();
  if (descriptionPrefix) description = description.replace(descriptionPrefix, '').trim();
  if (description.length < 2) return null;

  const installment = /(?:\bparcela\s*)?(\d{1,2})\s*\/\s*(\d{1,2})\b/i.exec(description);
  return {
    description: description.slice(0, 200),
    date: dateFromToken(dateToken, referenceDate),
    amount,
    ...(installment ? {
      installment_current: Number(installment[1]),
      installment_total: Number(installment[2]),
    } : {}),
  };
};

const parseNubankLine = (line, referenceDate) => itemFromLine(line, referenceDate, /^(?:nu\s+|nubank\s*[-:]\s*)/i);
const parseItauLine = (line, referenceDate) => itemFromLine(line, referenceDate, /^(?:itau\s*[-:]\s*)/i);
const parseInterLine = (line, referenceDate) => itemFromLine(line, referenceDate, /^(?:inter\s*[-:]\s*)/i);
const parseC6Line = (line, referenceDate) => itemFromLine(line, referenceDate, /^(?:c6\s*bank\s*[-:]\s*)/i);
const parseBradescoLine = (line, referenceDate) => itemFromLine(line, referenceDate, /^(?:bradesco\s*[-:]\s*)/i);
const parseSantanderLine = (line, referenceDate) => itemFromLine(line, referenceDate, /^(?:santander\s*[-:]\s*)/i);

export const INVOICE_ISSUERS = Object.freeze([
  { id: 'nubank', institution: 'Nubank', matches: /\bnubank\b|\bnu\s+bank\b/i, parseLine: parseNubankLine },
  { id: 'itau', institution: 'Itaú', matches: /\bitau\b/i, parseLine: parseItauLine },
  { id: 'inter', institution: 'Inter', matches: /\bbanco\s+inter\b|\binter\b/i, parseLine: parseInterLine },
  { id: 'c6', institution: 'C6 Bank', matches: /\bc6\s*bank\b|\bc6\s*bank/i, parseLine: parseC6Line },
  { id: 'bradesco', institution: 'Bradesco', matches: /\bbradesco\b/i, parseLine: parseBradescoLine },
  { id: 'santander', institution: 'Santander', matches: /\bsantander\b/i, parseLine: parseSantanderLine },
  { id: 'generic', institution: '', matches: /.*/, parseLine: (line, referenceDate) => itemFromLine(line, referenceDate) },
]);

const parseLines = (input) =>
  String(input || '').split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);

export function parseInvoiceText(text) {
  const lines = parseLines(text);
  if (!lines.length) {
    throw Object.assign(new Error('O PDF não contém texto legível para extração.'), { status: 422 });
  }

  const fullText = lines.join('\n');
  const parser = INVOICE_ISSUERS.find((issuer) => issuer.matches.test(normalizeText(fullText))) || INVOICE_ISSUERS.at(-1);
  const dueDate = labelledDate(lines, /\bvencimento\b|\bvence\s+em\b/);
  const closingDate = labelledDate(lines, /\b(fechamento|fecha\s+em|fechada\s+em)\b/);
  const referenceDate = dateFromToken(dueDate || '', null) || dateFromToken(closingDate || '', null);
  const items = lines.map((line) => parser.parseLine(line, referenceDate)).filter(Boolean);

  if (!items.length) {
    throw Object.assign(
      new Error('Não foi possível identificar lançamentos detalhados. O PDF pode ser digitalizado ou ter um formato não reconhecido.'),
      { status: 422 },
    );
  }

  const totals = labelledValue(lines, /\b(total\s+(?:(?:da|desta)\s+)?fatura|valor\s+total|total\s+a\s+pagar)\b/);
  const previousBalance = labelledValue(lines, /\b(saldo\s+anterior|fatura\s+anterior)\b/);
  const minimumPayment = labelledValue(lines, /\b(pagamento\s+minimo|valor\s+minimo)\b/);
  const cardMask = fullText.match(/(?:\*{2,}|•{2,}|x{2,})\s*\d{4}|\b(?:final|cart[aã]o)\s*(?:n[ºo.]?\s*)?\d{4}\b/i)?.[0] || '';
  const institution = parser.institution || lines.find((line) =>
    line.length >= 2 &&
    line.length <= 120 &&
    !SUMMARY_LINE_PATTERN.test(normalizeText(line)) &&
    !DATE_PATTERN.test(line) &&
    !TRANSACTION_AMOUNT_PATTERN.test(line),
  ) || '';

  return {
    institution,
    issuer: parser.id,
    card_mask: cardMask,
    closing_date: closingDate,
    due_date: dueDate,
    period_from: null,
    period_to: closingDate,
    previous_balance: previousBalance,
    declared_total: totals,
    minimum_payment: minimumPayment,
    document_kind: 'detalhada',
    items,
  };
}

const splitAtColumnBoundaries = (row, pageWidth) => {
  const groups = [];
  let current = [];
  let previous = null;
  let leftText = '';
  const minimumGap = Math.max(20, pageWidth * 0.04);

  for (const part of row) {
    const gap = previous ? part.x - (previous.x + previous.width) : 0;
    const startsNewTransaction = previous &&
      gap >= minimumGap &&
      TRANSACTION_AMOUNT_PATTERN.test(leftText) &&
      DATE_PATTERN.test(part.text);
    if (startsNewTransaction) {
      groups.push(current);
      current = [];
      leftText = '';
    }
    current.push(part);
    leftText += ` ${part.text}`;
    previous = part;
  }
  if (current.length) groups.push(current);
  return groups;
};

export function reconstructPdfLines(items, { yTolerance = 3, pageWidth = 0 } = {}) {
  const rows = [];
  for (const item of items || []) {
    const text = String(item.str || '').trim();
    if (!text) continue;
    const x = Number(item.transform?.[4] || 0);
    const y = Number(item.transform?.[5] || 0);
    const width = Number(item.width || 0);
    let row = rows.find((candidate) => Math.abs(candidate.y - y) <= yTolerance);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, y, width, text });
    row.y = row.parts.reduce((total, part) => total + part.y, 0) / row.parts.length;
  }

  return rows
    .sort((left, right) => right.y - left.y)
    .flatMap((row) => {
      const sorted = row.parts.sort((left, right) => left.x - right.x);
      return splitAtColumnBoundaries(sorted, pageWidth).map((group) =>
        group.map((part) => part.text).join(' ').replace(/\s+/g, ' ').trim(),
      );
    })
    .filter(Boolean);
}
