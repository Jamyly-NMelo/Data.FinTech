import test from 'node:test';
import assert from 'node:assert/strict';
import { INVOICE_ISSUERS, parseInvoiceText, reconstructPdfLines } from '../pdf-parser.js';

const headers = 'Vencimento 12/11/2026\nFechamento 05/11/2026\nTotal desta fatura R$ 1.250,90';

test('issuer-specific parsers identify each supported bank and parse transactions', () => {
  for (const issuer of INVOICE_ISSUERS.filter(({ id }) => id !== 'generic')) {
    const result = parseInvoiceText(`${issuer.institution}\n${headers}\n08/11/2026 Mercado Central R$ 1.250,90`);
    assert.equal(result.issuer, issuer.id);
    assert.equal(result.institution, issuer.institution);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].date, '2026-11-08');
    assert.equal(result.items[0].amount, 1250.9);
  }
});

test('generic fallback parses BRL amounts and installment information', () => {
  const result = parseInvoiceText(
    `Banco Regional\n${headers}\n08/11/2026 PASSAGEM AÉREA 02/10 R$ 1.250,90`,
  );
  assert.equal(result.issuer, 'generic');
  assert.equal(result.items[0].description, 'PASSAGEM AÉREA 02/10');
  assert.equal(result.items[0].installment_current, 2);
  assert.equal(result.items[0].installment_total, 10);
  assert.equal(result.items[0].amount, 1250.9);
});

test('negative values and CR credits are represented as negative amounts', () => {
  const result = parseInvoiceText(
    `Nubank\n${headers}\n08/11/2026 Estorno loja R$ 1.250,90 CR\n09/11/2026 Estorno parcial -R$ 10,00\n10/11/2026 Ajuste R$ 20,00-`,
  );
  assert.deepEqual(result.items.map(({ amount }) => amount), [-1250.9, -10, -20]);
});

test('summary rows are excluded while invoice totals remain available', () => {
  const result = parseInvoiceText(
    `Inter\n${headers}\nSaldo anterior R$ 200,00\nPagamento efetuado 07/11/2026 R$ 200,00\nTotal desta fatura R$ 1.250,90\n08/11/2026 Compra R$ 1.250,90`,
  );
  assert.equal(result.items.length, 1);
  assert.equal(result.previous_balance, 200);
  assert.equal(result.declared_total, 1250.9);
});

test('yearless transaction dates use the statement date year', () => {
  const result = parseInvoiceText(
    'C6 Bank\nVencimento 12/01/2027\nFechamento 05/01/2027\n04/01 Compra R$ 20,00',
  );
  assert.equal(result.items[0].date, '2027-01-04');
});

test('PDF text rows group Y coordinates, order by X, and separate side-by-side columns', () => {
  const at = (text, x, y, width = 0) => ({ str: text, width, transform: [1, 0, 0, 1, x, y] });
  const lines = reconstructPdfLines([
    at('R$ 100,00', 280, 500, 60),
    at('Farmácia', 470, 501),
    at('08/11/2026', 20, 500),
    at('08/11/2026', 430, 499),
    at('Mercado', 80, 499),
    at('R$ 20,00', 700, 500, 55),
  ], { pageWidth: 800 });

  assert.deepEqual(lines, [
    '08/11/2026 Mercado R$ 100,00',
    '08/11/2026 Farmácia R$ 20,00',
  ]);
  const parsed = parseInvoiceText(`Nubank\n${headers}\n${lines.join('\n')}`);
  assert.deepEqual(parsed.items.map(({ description, amount }) => [description, amount]), [
    ['Mercado', 100],
    ['Farmácia', 20],
  ]);
});

test('empty or unrecognized statement text produces a user-facing parse error', () => {
  assert.throws(() => parseInvoiceText(''), /não contém texto legível/i);
  assert.throws(() => parseInvoiceText('Fatura Nubank sem lançamentos'), /não foi possível identificar/i);
});
