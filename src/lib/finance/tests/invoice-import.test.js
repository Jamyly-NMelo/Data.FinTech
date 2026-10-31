/**
 * Testes da importação de fatura em PDF (modelo, duplicidades e payload).
 * Execução: node --test src/lib/finance/tests/invoice-import.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ITEM_TYPE,
  buildInvoiceTransactions,
  installmentsFromText,
  invoiceFingerprint,
  normalizeInvoiceDocument,
} from '../invoice.js';
import { buildReview, findInvoiceDuplicates, reviewItems, toggleItem, updateItem } from '../invoice-review.js';
import { buildLiquidity } from '../liquidity.js';
import { accountBalance } from '../ledger.js';
import { buildBackupPayload, validateBackup } from '../backup.js';

const CARD = {
  id: 'acc-card',
  name: 'Cartão principal',
  type: 'credit_card',
  environment: 'pf',
  opening_balance: 0,
  archived: false,
};

const RANGE = { from: '2026-09-01', to: '2026-10-31' };

const rawInvoice = (over = {}) => ({
  institution: 'Banco Exemplo',
  card_mask: '**** 1234',
  closing_date: '2026-10-05',
  due_date: '2026-10-12',
  period_from: '2026-09-06',
  period_to: '2026-10-05',
  previous_balance: 0,
  declared_total: 1250.9,
  minimum_payment: 187.63,
  document_kind: 'detalhada',
  items: [
    { description: 'Supermercado Bom Preço', date: '2026-09-10', amount: 320.5, type: 'compra' },
    { description: 'Farmácia Central', date: '2026-09-18', amount: 180.4, type: 'compra' },
    { description: 'Passagem aérea', date: '2026-09-22', amount: 600, type: 'compra', installment_current: 1, installment_total: 3 },
    { description: 'IOF internacional', date: '2026-09-22', amount: 200, type: 'encargo' },
    { description: 'Estorno farmácia', date: '2026-09-25', amount: 50, type: 'credito' },
  ],
  ...over,
});

const documentOf = (over = {}) => normalizeInvoiceDocument(rawInvoice(over), { accountId: CARD.id, environment: 'pf' });

const allSelected = (document) => document.items.map((item) => item.id);

test('PDF válido: lê, calcula totais e fecha com o valor declarado', () => {
  const document = documentOf();

  assert.equal(document.items.length, 5);
  assert.equal(document.fields.declaredTotal, 1250.9);
  assert.equal(document.calculated.purchases, 1100.9);
  assert.equal(document.calculated.charges, 200);
  assert.equal(document.calculated.credits, 50);
  assert.equal(document.calculated.matchesDeclared, true);
  assert.equal(document.missing.includes('Data de vencimento'), false);
  assert.equal(document.summaryOnly, false);
  assert.equal(document.hasContent, true);
});

test('PDF vazio, ilegível ou protegido não gera conteúdo importável', () => {
  const empty = normalizeInvoiceDocument(null);
  assert.equal(empty.hasContent, false);
  assert.equal(empty.items.length, 0);

  const unreadable = documentOf({ document_kind: 'ilegivel', items: [], declared_total: null });
  assert.equal(unreadable.hasContent, false);
  assert.ok(unreadable.warnings.some((warning) => warning.includes('ilegível')));
  assert.ok(unreadable.missing.includes('Lançamentos detalhados'));
});

test('campos ausentes e valores conflitantes pedem revisão manual', () => {
  const document = documentOf({ due_date: null, closing_date: null, declared_total: 999 });

  assert.ok(document.missing.includes('Data de vencimento'));
  assert.ok(document.missing.includes('Data de fechamento'));
  assert.equal(document.calculated.matchesDeclared, false);
  assert.ok(Math.abs(document.calculated.difference) > 0.05);
  assert.ok(document.warnings.some((warning) => warning.includes('não fecha')));

  const review = buildReview({ document, items: reviewItems(document), accountId: CARD.id });
  assert.equal(review.canConfirm, true);
});

test('data ilegível não é inventada: fica nula e é sinalizada', () => {
  const document = documentOf({
    items: [{ description: 'Compra sem data', date: 'sem data', amount: 100, type: 'compra' }],
    declared_total: 100,
  });

  assert.equal(document.items[0].date, null);
  assert.ok(document.items[0].issues.some((issue) => issue.includes('Data')));
  assert.ok(document.warnings.some((warning) => warning.includes('sem data')));
});

test('fatura já existente para o cartão e vencimento apenas alerta', () => {
  const document = documentOf();
  const invoices = [
    {
      id: 'inv-1',
      account_id: CARD.id,
      due_date: document.dueDate,
      declared_total: 900,
      fingerprint: 'outra-impressao',
      status: 'confirmado',
    },
  ];

  const result = findInvoiceDuplicates(document, { invoices, transactions: [], accountId: CARD.id });
  assert.equal(result.blockers.length, 0);
  assert.ok(result.alerts.some((alert) => alert.code === 'vencimento_repetido'));
});

test('valor igual, isoladamente, não bloqueia a importação', () => {
  const document = documentOf();
  const invoices = [
    { id: 'inv-1', account_id: CARD.id, due_date: '2026-11-12', declared_total: document.fields.declaredTotal, fingerprint: 'x' },
  ];

  const result = findInvoiceDuplicates(document, { invoices, transactions: [], accountId: CARD.id });
  assert.equal(result.blockers.length, 0);
  assert.ok(result.alerts.some((alert) => alert.code === 'valor_repetido'));
});

test('reimportação do mesmo documento é bloqueada', () => {
  const document = documentOf();
  const fingerprint = invoiceFingerprint({
    accountId: CARD.id,
    dueDate: document.dueDate,
    declaredTotal: document.fields.declaredTotal,
    periodFrom: document.periodFrom,
    periodTo: document.periodTo,
    items: document.items,
  });
  const invoices = [{ id: 'inv-1', account_id: CARD.id, due_date: document.dueDate, fingerprint, status: 'confirmado' }];

  const result = findInvoiceDuplicates(document, { invoices, transactions: [], accountId: CARD.id });
  assert.equal(result.blockers.length, 1);
  assert.equal(result.blockers[0].code, 'documento_reimportado');

  const review = buildReview({ document, items: reviewItems(document), duplicates: result, accountId: CARD.id });
  assert.equal(review.canConfirm, false);
});

test('editar o total na conferência não libera a reimportação do mesmo PDF', () => {
  const document = documentOf();
  const fingerprint = invoiceFingerprint({
    accountId: CARD.id,
    dueDate: document.dueDate,
    declaredTotal: document.fields.declaredTotal,
    periodFrom: document.periodFrom,
    periodTo: document.periodTo,
    items: document.items,
  });
  const edited = { ...document, extractedFingerprint: fingerprint, fields: { ...document.fields, declaredTotal: 10 } };
  const invoices = [{ id: 'inv-1', account_id: CARD.id, fingerprint, status: 'confirmado' }];

  const result = findInvoiceDuplicates(edited, { invoices, transactions: [], accountId: CARD.id });
  assert.equal(result.blockers.length, 1);
});

test('compras já registradas são desmarcadas; descrição diferente apenas alerta', () => {
  const document = documentOf();
  const transactions = [
    {
      id: 'tx-1',
      account_id: CARD.id,
      amount: 320.5,
      description: 'Supermercado Bom Preço',
      settlement_date: '2026-09-10',
      status: 'settled',
      kind: 'expense',
    },
    {
      id: 'tx-2',
      account_id: CARD.id,
      amount: 180.4,
      description: 'Outro estabelecimento',
      settlement_date: '2026-09-18',
      status: 'settled',
      kind: 'expense',
    },
  ];

  const items = reviewItems(document, { transactions, accountId: CARD.id });
  const strong = items.find((item) => item.amount === 320.5);
  const partial = items.find((item) => item.amount === 180.4);

  assert.equal(strong.duplicate.level, 'forte');
  assert.equal(strong.selected, false);
  assert.equal(partial.duplicate.level, 'parcial');
  assert.equal(partial.selected, true);
});

test('pagamento parcial é preservado e não vira lançamento', () => {
  const document = documentOf({
    items: [
      { description: 'Compra', date: '2026-09-10', amount: 300, type: 'compra' },
      { description: 'Pagamento recebido', date: '2026-09-20', amount: 200, type: 'pagamento' },
    ],
    declared_total: 100,
  });

  const items = reviewItems(document, { transactions: [], accountId: CARD.id });
  const payment = items.find((item) => item.type === ITEM_TYPE.PAYMENT);
  assert.equal(payment.selected, false);

  const review = buildReview({ document, items, accountId: CARD.id });
  assert.equal(review.paymentsCount, 1);
  assert.ok(review.changes.some((change) => change.includes('não serão importados')));

  const payloads = buildInvoiceTransactions(document, {
    accountId: CARD.id,
    environment: 'pf',
    selectedIds: [payment.id],
  });
  assert.equal(payloads.length, 0);
});

test('créditos e estornos entram como entrada no cartão', () => {
  const document = documentOf();
  const payloads = buildInvoiceTransactions(document, {
    accountId: CARD.id,
    environment: 'pf',
    selectedIds: allSelected(document),
  });

  const credit = payloads.find((tx) => tx.amount === 50);
  const purchase = payloads.find((tx) => tx.amount === 320.5);

  assert.equal(payloads.length, 5);
  assert.equal(credit.kind, 'income');
  assert.equal(purchase.kind, 'expense');
  assert.equal(purchase.status, 'settled');
  assert.equal(purchase.account_id, CARD.id);
  assert.equal(purchase.card_invoice_account_id, CARD.id);
  assert.equal(purchase.due_date, '2026-10-12');
});

test('cancelar antes de confirmar não produz lançamentos', () => {
  const document = documentOf();
  const items = reviewItems(document).map((item) => toggleItem(reviewItems(document), item.id)).flatMap((item) => (item.selected ? [] : [item]));

  const noneSelected = buildInvoiceTransactions(document, {
    accountId: CARD.id,
    environment: 'pf',
    selectedIds: items.map((item) => item.id),
  });
  assert.equal(noneSelected.length, 0);

  const review = buildReview({ document, items: items.map((item) => ({ ...item, selected: false })), accountId: CARD.id });
  assert.equal(review.createCount, 0);
  assert.equal(review.canConfirm, false);
});

test('falha de validação não deixa gravação parcial nem altera o documento', () => {
  const document = documentOf();
  const snapshot = JSON.stringify(document.items);

  const review = buildReview({ document, items: reviewItems(document), accountId: null });
  assert.equal(review.canConfirm, false);
  assert.ok(review.errors.some((error) => error.includes('cartão')));

  assert.equal(JSON.stringify(document.items), snapshot);
});

test('documento só com resumo não inventa lançamentos individuais', () => {
  const document = documentOf({
    document_kind: 'resumo',
    items: [],
    declared_total: 800,
    previous_balance: 120,
  });

  assert.equal(document.summaryOnly, true);
  assert.equal(document.items.length, 0);
  assert.ok(document.missing.includes('Lançamentos detalhados'));
  assert.ok(document.warnings.some((warning) => warning.includes('resumo')));
  assert.equal(
    buildInvoiceTransactions(document, { accountId: CARD.id, environment: 'pf', selectedIds: ['item-0'] }).length,
    0,
  );
});

test('impressão digital é estável e muda com o conteúdo', () => {
  const base = documentOf();
  const same = documentOf();
  const changed = documentOf({ declared_total: 1300 });

  const fingerprint = (document) =>
    invoiceFingerprint({
      accountId: CARD.id,
      dueDate: document.dueDate,
      declaredTotal: document.fields.declaredTotal,
      periodFrom: document.periodFrom,
      periodTo: document.periodTo,
      items: document.items,
    });

  assert.equal(fingerprint(base), fingerprint(same));
  assert.notEqual(fingerprint(base), fingerprint(changed));
});

test('fatura importada não duplica o passivo já representado pelo cartão', () => {
  const document = documentOf();
  const payloads = buildInvoiceTransactions(document, {
    accountId: CARD.id,
    environment: 'pf',
    selectedIds: allSelected(document),
  });
  const transactions = payloads.map((payload, index) => ({ ...payload, id: `tx-${index}` }));

  const balance = accountBalance(CARD, transactions, { until: RANGE.to });
  assert.equal(balance, -1250.9);

  const liquidity = buildLiquidity({ accounts: [CARD], transactions, range: RANGE, environment: 'pf' });
  assert.equal(liquidity.payables, 0);
  assert.equal(liquidity.cardInvoices, 1250.9);
  assert.equal(liquidity.currentLiabilities, 1250.9);
});

test('dados editados na conferência alimentam o payload final', () => {
  const document = documentOf();
  const items = reviewItems(document);
  const target = items.find((item) => item.amount === 320.5);
  const edited = updateItem(items, target.id, { description: 'Supermercado corrigido', amount: 300 });

  const review = buildReview({ document, items: edited, accountId: CARD.id });
  assert.equal(review.createCount, 5);

  const payloads = buildInvoiceTransactions(document, {
    accountId: CARD.id,
    environment: 'pf',
    selectedIds: review.selectedIds,
  });
  assert.equal(payloads.some((tx) => tx.amount === 300), false);
});

test('parcelas vêm do texto do lançamento quando existem', () => {
  assert.deepEqual(installmentsFromText('PASSAGEM AEREA 2/10'), { current: 2, total: 10 });
  assert.deepEqual(installmentsFromText('PARCELA 3 DE 12'), { current: 3, total: 12 });
  assert.equal(installmentsFromText('SUPERMERCADO BOM PRECO'), null);
  assert.equal(installmentsFromText('COMPRA 5/2'), null);
});

test('leitura que repete a mesma parcela em todos os itens é descartada', () => {
  const document = normalizeInvoiceDocument(
    rawInvoice({
      items: [
        { description: 'SUPERMERCADO BOM PRECO', date: '2026-09-10', amount: 320.5, type: 'compra', installment_current: 1, installment_total: 3 },
        { description: 'FARMACIA CENTRAL', date: '2026-09-18', amount: 180.4, type: 'compra', installment_current: 1, installment_total: 3 },
        { description: 'PASSAGEM AEREA 1/3', date: '2026-09-22', amount: 600, type: 'compra', installment_current: 1, installment_total: 3 },
      ],
      declared_total: 1100.9,
    }),
    { accountId: CARD.id, environment: 'pf' },
  );

  assert.equal(document.items[0].installmentTotal, null);
  assert.equal(document.items[0].installmentCurrent, null);
  assert.equal(document.items[1].installmentTotal, null);
  assert.equal(document.items[2].installmentTotal, 3);
  assert.equal(document.items[2].installmentCurrent, 1);
  assert.ok(document.warnings.some((warning) => warning.includes('parcelas foram ignoradas')));
});

test('backup: fatura, novos campos de dívida e vínculo do cartão sobrevivem', () => {
  const payload = buildBackupPayload({
    Account: [CARD],
    Debt: [{ id: 'debt-1', name: 'Empréstimo', outstanding_balance: 5000, term: 'longo_prazo', maturity_date: '2029-01-10', future_interest: 800 }],
    CardInvoice: [
      {
        id: 'inv-1',
        account_id: CARD.id,
        environment: 'pf',
        due_date: '2026-10-12',
        declared_total: 1250.9,
        fingerprint: 'abc',
        source: 'pdf_import',
        status: 'confirmado',
        summary_only: false,
      },
    ],
    Transaction: [
      {
        id: 'tx-1',
        description: 'Compra',
        kind: 'expense',
        amount: 100,
        account_id: CARD.id,
        card_invoice_account_id: CARD.id,
        debt_id: 'debt-1',
        status: 'settled',
      },
    ],
  });

  const result = validateBackup(payload);
  assert.equal(result.ok, true);
  assert.equal(result.data.CardInvoice.length, 1);
  assert.equal(result.data.CardInvoice[0].fingerprint, 'abc');
  assert.equal(result.data.Debt[0].term, 'longo_prazo');
  assert.equal(result.data.Debt[0].future_interest, 800);
  assert.equal(result.data.Transaction[0].card_invoice_account_id, CARD.id);
});

test('backup antigo (sem os campos novos) continua válido e preservado', () => {
  const payload = buildBackupPayload({
    Account: [CARD],
    Debt: [{ id: 'debt-old', name: 'Dívida antiga', outstanding_balance: 2000 }],
  });

  const result = validateBackup(payload);
  assert.equal(result.ok, true);
  assert.equal(result.data.Debt[0].term, undefined);
  assert.equal(result.data.Debt[0].outstanding_balance, 2000);
  assert.deepEqual(result.data.CardInvoice, []);
});