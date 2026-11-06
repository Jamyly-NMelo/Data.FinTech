import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKUP_ENTITIES,
  buildBackupPayload,
  parseBackupText,
  replaceBackupData,
  restoreBackupText,
  toInsertable,
} from '../backup.js';

const syntheticCollections = () => ({
  Account: [
    { id: 'TEST_ACCOUNT_CARD', name: 'TEST Cartão', type: 'credit_card', environment: 'pf', opening_balance: 0 },
  ],
  Debt: [
    {
      id: 'TEST_DEBT_1',
      name: 'TEST Empréstimo',
      outstanding_balance: 1200,
      interest_outstanding: 80,
      short_term_balance: 400,
      long_term_balance: 800,
    },
  ],
  Transaction: [
    {
      id: 'TEST_TRANSACTION_1',
      description: 'TEST compra',
      kind: 'expense',
      amount: 125,
      account_id: 'TEST_ACCOUNT_CARD',
      card_invoice_account_id: 'TEST_ACCOUNT_CARD',
      debt_id: 'TEST_DEBT_1',
    },
  ],
});

test('backup sintético exporta, importa e preserva campos de dívida e referências', () => {
  const payload = buildBackupPayload(syntheticCollections(), { generated_at: '2026-01-02T00:00:00.000Z' });
  const result = parseBackupText(JSON.stringify(payload));

  assert.equal(result.ok, true);
  assert.deepEqual(result.preview.importCounts, { create: 3, ignore: 0, reject: 0 });
  for (const entity of BACKUP_ENTITIES) {
    const restored = result.data[entity].map(({ __source_id, ...record }) => ({ ...record, id: __source_id }));
    assert.deepEqual(restored, payload.data[entity], `round-trip mismatch for ${entity}`);
  }
});

test('backup antigo sem os novos campos de dívida continua válido', () => {
  const payload = buildBackupPayload({
    Debt: [{ id: 'TEST_OLD_DEBT', name: 'TEST Dívida antiga', outstanding_balance: 300 }],
  });
  const oldData = JSON.parse(JSON.stringify(payload));
  delete oldData.data.Debt[0].interest_outstanding;
  delete oldData.data.Debt[0].short_term_balance;
  delete oldData.data.Debt[0].long_term_balance;

  const result = parseBackupText(JSON.stringify(oldData));
  assert.equal(result.ok, true);
  assert.equal(result.data.Debt[0].outstanding_balance, 300);
  assert.equal(result.data.Debt[0].interest_outstanding, undefined);
});

test('JSON corrompido, outro formato e IDs duplicados são recusados sem chamar gravação', async () => {
  let writeCalls = 0;
  const write = async () => { writeCalls += 1; };
  const valid = buildBackupPayload(syntheticCollections());
  const wrongApp = { ...valid, app: 'TEST_OTHER_APP' };
  const wrongVersion = { ...valid, format_version: 999 };
  const duplicateIds = buildBackupPayload({
    Account: [
      { id: 'TEST_DUPLICATE_ID', name: 'TEST Conta A', type: 'checking' },
      { id: 'TEST_DUPLICATE_ID', name: 'TEST Conta B', type: 'checking' },
    ],
  });

  for (const text of ['{corrompido', JSON.stringify(wrongApp), JSON.stringify(wrongVersion), JSON.stringify(duplicateIds)]) {
    const result = await restoreBackupText(text, write);
    assert.equal(result.ok, false);
    assert.ok(result.preview.importCounts.reject > 0);
  }
  assert.equal(writeCalls, 0);
});

test('prévia conta preferências como ignoradas e rejeita atomicamente um backup inválido', () => {
  const valid = buildBackupPayload({
    Account: [{ id: 'TEST_ACCOUNT_1', name: 'TEST Conta', type: 'checking' }],
    Preferences: [{ id: 'TEST_PREFERENCES_1', theme: 'dark', privacy_mode: true }],
  });
  valid.data.Experimental = [{ id: 'TEST_UNKNOWN_1' }, { id: 'TEST_UNKNOWN_2' }];
  const result = parseBackupText(JSON.stringify(valid));
  assert.equal(result.ok, true);
  assert.deepEqual(result.preview.importCounts, { create: 1, ignore: 3, reject: 0 });

  const invalid = {
    ...valid,
    data: {
      ...valid.data,
      Account: [{ id: 'TEST_ACCOUNT_INVALID', name: '', type: 'checking' }],
    },
  };
  const rejected = parseBackupText(JSON.stringify(invalid));
  assert.equal(rejected.ok, false);
  assert.deepEqual(rejected.preview.importCounts, { create: 0, ignore: 0, reject: 4 });
});

test('backup substitui a coleção em vez de anexar registros já existentes', async () => {
  const payload = buildBackupPayload({
    Account: [{ id: 'TEST_EXISTING_ACCOUNT', name: 'TEST Conta restaurada', type: 'checking' }],
  });
  const validated = parseBackupText(JSON.stringify(payload));
  assert.equal(validated.ok, true);

  let stored = [{ id: 'TEST_EXISTING_ACCOUNT', name: 'TEST Conta anterior', type: 'checking' }];
  let generatedId = 0;
  const restore = async () => replaceBackupData(validated.data, {
    snapshot: { Account: stored },
    clear: async () => { stored = []; },
    write: async (collections) => {
      stored = collections.Account.map((record) => ({ ...toInsertable(record), id: `TEST_CREATED_${++generatedId}` }));
    },
  });

  await restore();
  await restore();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].name, 'TEST Conta restaurada');
  assert.equal(stored[0].id, 'TEST_CREATED_2');
});

test('falha durante gravação limpa os dados parciais e restaura o snapshot sintético', async () => {
  const snapshot = { Account: [{ id: 'TEST_SNAPSHOT', name: 'TEST Conta protegida', type: 'checking' }] };
  let stored = structuredClone(snapshot.Account);
  let writeAttempt = 0;

  await assert.rejects(
    replaceBackupData({ Account: [] }, {
      snapshot,
      clear: async () => { stored = []; },
      write: async (collections) => {
        writeAttempt += 1;
        if (writeAttempt === 1) {
          stored = [{ name: 'TEST gravação parcial' }];
          throw new Error('TEST falha simulada');
        }
        stored = structuredClone(collections.Account);
      },
    }),
    /dados anteriores foram restaurados automaticamente/,
  );
  assert.deepEqual(stored, snapshot.Account);
});
