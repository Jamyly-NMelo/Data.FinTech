import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

export const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_PDF_PAGES = 40;
const MAX_EXTRACTED_CHARACTERS = 500_000;

const datePattern = /\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b/g;
const dateInLinePattern = /\b\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\b/;
const amountPattern = /-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}\b/g;
const amountInLinePattern = /-?\s*(?:R\$\s*)?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}\b/;
const ignoredTransactionLine = /\b(total|vencimento|fechamento|saldo|pagamento\s+m[ií]nimo|limite|melhor\s+dia|resumo|encargos\s+totais)\b/i;
const normalizeText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const moneyFromLine = (line) => {
  const amounts = line.match(new RegExp(amountPattern.source, 'g')) || [];
  return amounts.length ? amounts[amounts.length - 1].replace(/[^\d,-]/g, '').trim() : null;
};

const labelledValue = (lines, labelPattern) => {
  for (const line of lines) {
    if (!labelPattern.test(normalizeText(line))) continue;
    const value = moneyFromLine(line);
    if (value) return value;
  }
  return null;
};

const labelledDate = (lines, labelPattern) => {
  for (const line of lines) {
    if (!labelPattern.test(normalizeText(line))) continue;
    const match = line.match(datePattern);
    if (match?.length) return match[0];
  }
  return null;
};

export function parseInvoiceText(text) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (!lines.length) {
    throw Object.assign(new Error('O PDF não contém texto legível para extração.'), { status: 422 });
  }

  const items = [];
  for (const line of lines) {
    if (ignoredTransactionLine.test(normalizeText(line))) continue;
    const date = line.match(datePattern)?.[0];
    const amount = moneyFromLine(line);
    if (!date || !amount) continue;

    const description = line
      .replace(datePattern, ' ')
      .replace(amountPattern, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[\s|•*-]+|[\s|•*-]+$/g, '')
      .trim();
    if (description.length < 2) continue;
    items.push({ description: description.slice(0, 200), date, amount });
  }

  if (!items.length) {
    throw Object.assign(
      new Error('Não foi possível identificar lançamentos detalhados. O PDF pode ser digitalizado ou ter um formato não reconhecido.'),
      { status: 422 },
    );
  }

  const dueDate = labelledDate(lines, /\bvencimento\b/);
  const closingDate = labelledDate(lines, /\b(fechamento|fecha\s+em)\b/);
  const totals = labelledValue(lines, /\b(total\s+(da\s+)?fatura|valor\s+total)\b/);
  const previousBalance = labelledValue(lines, /\b(saldo\s+anterior|fatura\s+anterior)\b/);
  const minimumPayment = labelledValue(lines, /\b(pagamento\s+minimo|valor\s+minimo)\b/);
  const cardMask = lines.join(' ').match(/(?:\*{2,}|•{2,}|x{2,})\s*\d{4}|\b(?:final|cart[aã]o)\s*(?:n[ºo.]?\s*)?\d{4}\b/i)?.[0] || '';
  const institution = lines.find((line) =>
    line.length >= 2 &&
    line.length <= 120 &&
    !ignoredTransactionLine.test(normalizeText(line)) &&
    !dateInLinePattern.test(line) &&
    !amountInLinePattern.test(line),
  ) || '';

  return {
    institution,
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

const pageTextLines = (items) => {
  const rows = new Map();
  for (const item of items) {
    const text = String(item.str || '').trim();
    if (!text) continue;
    const y = Math.round(Number(item.transform?.[5] || 0) / 3) * 3;
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y).push({ x: Number(item.transform?.[4] || 0), text });
  }
  return [...rows.entries()]
    .sort(([left], [right]) => right - left)
    .map(([, row]) => row.sort((left, right) => left.x - right.x).map((part) => part.text).join(' ').trim())
    .filter(Boolean);
};

export async function extractInvoicePdf(input) {
  const bytes = new Uint8Array(input);
  if (!bytes.length || bytes.length > MAX_PDF_BYTES) {
    throw Object.assign(new Error('O PDF está vazio ou excede o limite de 10 MiB.'), { status: bytes.length ? 413 : 400 });
  }
  if (String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-') {
    throw Object.assign(new Error('O arquivo enviado não é um PDF válido.'), { status: 415 });
  }

  let loadingTask;
  try {
    loadingTask = getDocument({
      data: bytes,
      disableFontFace: true,
      isEvalSupported: false,
      verbosity: 0,
    });
    const document = await loadingTask.promise;
    if (document.numPages > MAX_PDF_PAGES) {
      throw Object.assign(new Error('O PDF excede o limite de 40 páginas.'), { status: 413 });
    }

    const lines = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      lines.push(...pageTextLines(content.items));
      if (lines.join('\n').length > MAX_EXTRACTED_CHARACTERS) {
        throw Object.assign(new Error('O conteúdo de texto do PDF excede o limite de leitura.'), { status: 413 });
      }
    }
    return parseInvoiceText(lines.join('\n'));
  } catch (error) {
    if (Number(error.status)) throw error;
    throw Object.assign(new Error('Não foi possível ler o conteúdo deste PDF.'), { status: 422 });
  } finally {
    await loadingTask?.destroy();
  }
}
