import assert from 'node:assert/strict';
import test from 'node:test';
import { extractInvoicePdf, parseInvoiceText } from './invoice-parser.js';

const makePdf = (content) => {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
};

test('extração de PDF legível identifica estabelecimento, datas, valor e parcelas', async () => {
  const content = [
    'BT /F1 12 Tf 50 750 Td (BANCO TESTE) Tj 0 -18 Td (Vencimento 12/10/2026) Tj',
    '0 -18 Td (Fechamento 05/10/2026) Tj 0 -18 Td (SUPERMERCADO BOM PRECO 10/09/2026 2/3 R$ 320,50) Tj',
    '0 -18 Td (Total da fatura R$ 320,50) Tj ET',
  ].join(' ');
  const result = await extractInvoicePdf(makePdf(content));

  assert.equal(result.institution, 'BANCO TESTE');
  assert.equal(result.due_date, '12/10/2026');
  assert.equal(result.closing_date, '05/10/2026');
  assert.equal(result.declared_total, '320,50');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].description.includes('2/3'), true);
  assert.equal(result.items[0].amount, '320,50');
});

test('texto ilegível ou sem linhas de lançamento falha explicitamente', () => {
  assert.throws(() => parseInvoiceText(''), /não contém texto legível/);
  assert.throws(() => parseInvoiceText('FATURA BANCO TESTE\nVencimento 12/10/2026'), /Não foi possível identificar lançamentos/);
});

test('upload rejeita arquivos que não são PDF', async () => {
  await assert.rejects(() => extractInvoicePdf(Buffer.from('not a pdf')), /não é um PDF válido/);
});
