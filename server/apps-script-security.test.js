import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../apps-script/Codigo.gs', import.meta.url), 'utf8');

const createScriptContext = (gatewaySecret = 'test-secret-with-at-least-thirty-two-characters') => {
  const context = {
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (key) => key === 'GATEWAY_SECRET' ? gatewaySecret : null }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (_algorithm, value) => [...createHash('sha256').update(String(value)).digest()].map((byte) => byte > 127 ? byte - 256 : byte),
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (content) => ({
        content,
        setMimeType() { return this; },
      }),
    },
    Logger: { log() {} },
  };
  runInNewContext(source, context);
  return context;
};

test('Apps Script exige o segredo do gateway para operações e mantém somente settings público', () => {
  const context = createScriptContext();
  const denied = JSON.parse(context.dispatch_({ action: 'records.list' }, 'GET').content);
  const publicSettings = JSON.parse(context.dispatch_({ action: 'auth.publicSettings' }, 'GET').content);

  assert.equal(denied.status, 'erro');
  assert.equal(denied.httpStatus, 401);
  assert.equal(publicSettings.status, 'sucesso');
  assert.deepEqual(JSON.parse(JSON.stringify(publicSettings.data)), { id: 'data-fintech', public_settings: {} });
});

test('requisições sem segredo não conseguem gravar eventos de falha de autenticação', () => {
  const context = createScriptContext();
  const events = [];
  context.auditEvent_ = (...args) => events.push(args);

  context.dispatch_({ action: 'auth.login', email: 'bad@example.com' }, 'POST');
  assert.equal(events.length, 0);

  context.dispatch_({
    action: 'auth.login',
    email: 'invalid',
    gateway_secret: 'test-secret-with-at-least-thirty-two-characters',
  }, 'POST');
  assert.equal(events.length, 1);
  assert.equal(events[0][0], 'auth.login.failure');
});

test('Apps Script aceita o segredo apenas para chamar o handler e ainda exige sessão do usuário', () => {
  const secret = 'test-secret-with-at-least-thirty-two-characters';
  const context = createScriptContext(secret);
  const result = JSON.parse(context.dispatch_({ action: 'records.list', gateway_secret: secret, entity: 'Account' }, 'GET').content);

  assert.equal(result.status, 'erro');
  assert.equal(result.httpStatus, 401);
  assert.match(result.mensagem, /Autenticação necessária/);
});

test('CRUD lista somente registros do usuário autenticado', () => {
  const context = createScriptContext();
  context.readTable_ = () => ({
    rows: [
      { rowNum: 2, obj: { id: 'account-a', created_by_id: 'user-a' } },
      { rowNum: 3, obj: { id: 'account-b', created_by_id: 'user-b' } },
    ],
  });
  context.colsOf_ = () => [];
  context.toRecord_ = (_entity, row) => row;

  const records = context.loadOwned_('Account', { id: 'user-a', role: 'user' });

  assert.deepEqual(Array.from(records.list, (entry) => entry.rec.id), ['account-a']);
});

test('referências de registros financeiros rejeitam IDs pertencentes a outro usuário', () => {
  const context = createScriptContext();
  context.loadOwned_ = (entity) => ({
    list: entity === 'Account' ? [{ rec: { id: 'account-owned' } }] : [],
  });
  const user = { id: 'user-a', role: 'user' };

  assert.doesNotThrow(() => context.validateOwnedReferences_('Transaction', { account_id: 'account-owned' }, user));
  assert.throws(
    () => context.validateOwnedReferences_('Transaction', { account_id: 'account-other-user' }, user),
    /Referência inválida ou não autorizada/,
  );
});

test('importação de fatura vincula lançamentos ao cartão próprio e registra ambiente validado', () => {
  const context = createScriptContext();
  const user = { id: 'user-a', email: 'a@example.com', role: 'user' };
  const writes = [];
  context.requireUser_ = () => user;
  context.loadOwned_ = (entity) => ({
    list: entity === 'Account'
      ? [{ rec: { id: 'card-a', type: 'credit_card', environment: 'pj' } }]
      : [],
  });
  context.buildRecord_ = (entity, values, owner) => ({
    ...values,
    id: `${entity}-${writes.length}`,
    created_by_id: owner.id,
  });
  context.readTable_ = (entity) => ({ entity });
  context.colsOf_ = () => [];
  context.appendRows_ = (table, rows) => writes.push({ entity: table.entity, rows });
  context.toRecord_ = (_entity, record) => record;

  const result = context.recImportInvoice_({
    invoice: { account_id: 'card-a', environment: 'pj', fingerprint: 'source-fingerprint' },
    transactions: [{
      account_id: 'card-a',
      card_invoice_account_id: 'card-a',
      environment: 'pj',
      kind: 'expense',
      amount: 25,
    }],
  });

  assert.equal(writes.length, 2);
  assert.equal(writes[0].entity, 'Transaction');
  assert.equal(writes[1].entity, 'CardInvoice');
  assert.equal(result.invoice.environment, 'pj');
  assert.deepEqual(result.invoice.transaction_ids, [result.transactions[0].id]);
  assert.equal(result.transactions[0].created_by_id, user.id);
});

test('importação rejeita cartão de outro usuário, ambiente incompatível e fatura repetida', () => {
  const context = createScriptContext();
  const user = { id: 'user-a', role: 'user' };
  context.requireUser_ = () => user;
  context.loadOwned_ = (entity) => ({
    list: entity === 'Account'
      ? [{ rec: { id: 'card-a', type: 'credit_card', environment: 'pf' } }]
      : entity === 'CardInvoice'
        ? [{ rec: { id: 'invoice-a', account_id: 'card-a', fingerprint: 'duplicate', status: 'confirmado' } }]
        : [],
  });
  context.buildRecord_ = (entity, values) => ({ ...values, id: entity });
  context.readTable_ = (entity) => ({ entity });
  context.colsOf_ = () => [];
  context.appendRows_ = () => { throw new Error('não deve gravar'); };

  const transactions = [{
    account_id: 'card-a',
    card_invoice_account_id: 'card-a',
    environment: 'pf',
    kind: 'expense',
    amount: 10,
  }];
  assert.throws(
    () => context.recImportInvoice_({
      invoice: { account_id: 'card-a', environment: 'pj', fingerprint: 'new' },
      transactions,
    }),
    /ambiente da fatura não corresponde/,
  );
  assert.throws(
    () => context.recImportInvoice_({
      invoice: { account_id: 'card-other', environment: 'pf', fingerprint: 'new' },
      transactions,
    }),
    /Cartão inválido/,
  );
  assert.throws(
    () => context.recImportInvoice_({
      invoice: { account_id: 'card-a', environment: 'pf', fingerprint: 'duplicate' },
      transactions,
    }),
    /já foi importada/,
  );
});

test('tentativas de atualizar ou excluir o registro de outro usuário não alteram a planilha', () => {
  const context = createScriptContext();
  const writes = [];
  const deletes = [];
  const account = { id: 'account-a', name: 'Conta própria', type: 'checking', created_by_id: 'user-a' };
  context.requireUser_ = () => ({ id: 'user-a', role: 'user' });
  context.requireEntity_ = () => 'Account';
  context.loadOwned_ = () => ({
    list: [{ rec: { id: account.id }, rowNum: 2 }],
    table: { rows: [{ rowNum: 2, obj: account }] },
  });
  context.parseMaybeJson_ = (value) => value;
  context.validateOwnedReferences_ = () => {};
  context.encode_ = (_definition, value) => value;
  context.nowIso_ = () => '2025-01-01T00:00:00.000Z';
  context.writeRow_ = (...args) => writes.push(args);
  context.deleteRowNums_ = (...args) => deletes.push(args);
  context.toRecord_ = (_entity, value) => value;

  assert.throws(
    () => context.recUpdate_({ entity: 'Account', id: 'account-b', values: { name: 'Alterada' } }),
    /Registro não encontrado/,
  );
  assert.throws(
    () => context.recDelete_({ entity: 'Account', id: 'account-b' }),
    /Registro não encontrado/,
  );
  context.recUpdate_({
    entity: 'Account',
    id: 'account-a',
    values: { name: 'Atualizada', created_by_id: 'user-b' },
  });

  assert.equal(writes.length, 1);
  assert.equal(writes[0][2].created_by_id, 'user-a');
  assert.equal(writes[0][2].name, 'Atualizada');
  assert.equal(deletes.length, 0);
});

test('renovar sessão atualiza a expiração persistente e rejeita sessões com mais de 90 dias', () => {
  const context = createScriptContext();
  const token = 'session-token-for-renewal';
  const issuedAt = new Date(Date.now() - 10 * 86400000).toISOString();
  const row = {
    rowNum: 2,
    obj: {
      token_hash: context.sha256hex_(token),
      user_id: 'user-a',
      issued_at: issuedAt,
      expires_at: Date.now() + 86400000,
      created_date: issuedAt,
    },
  };
  const writes = [];
  context.requireUser_ = () => ({ id: 'user-a', email: 'a@example.com', role: 'user' });
  context.readTable_ = () => ({
    rows: [row],
    sh: { deleteRows() {} },
  });
  context.writeRow_ = (...args) => writes.push(args);

  const renewed = context.authRenew_({ access_token: token });

  assert.equal(renewed.ok, true);
  assert.equal(renewed.user.id, 'user-a');
  assert.equal(writes.length, 1);
  assert.ok(writes[0][2].expires_at > Date.now() + 29 * 86400000);

  row.obj.issued_at = new Date(Date.now() - 91 * 86400000).toISOString();
  assert.throws(() => context.authRenew_({ access_token: token }), /Sessão expirada/);
});

test('sessões vencidas ou com expiração inválida não autenticam usuário', () => {
  const context = createScriptContext();
  const token = 'session-token-expired';
  const row = {
    rowNum: 2,
    obj: {
      token_hash: context.sha256hex_(token),
      user_id: 'user-a',
      issued_at: new Date().toISOString(),
      expires_at: Date.now() - 1,
      created_date: new Date().toISOString(),
    },
  };
  context.readTable_ = () => ({ rows: [row] });
  context.usersTable_ = () => {
    throw new Error('Uma sessão inválida não deve carregar o usuário.');
  };

  assert.equal(context.optionalUser_({ access_token: token }), null);
  row.obj.expires_at = 'not-a-date';
  assert.equal(context.optionalUser_({ access_token: token }), null);
});

test('logout revoga a sessão armazenada no Apps Script', () => {
  const context = createScriptContext();
  const token = 'session-token-for-logout';
  const row = { rowNum: 4, obj: { token_hash: context.sha256hex_(token), user_id: 'user-a' } };
  let deletedRows;
  context.readTable_ = () => ({ rows: [row] });
  context.deleteRowNums_ = (_table, rows) => { deletedRows = rows; };

  assert.deepEqual(JSON.parse(JSON.stringify(context.authLogout_({ access_token: token }))), { ok: true });
  assert.deepEqual(deletedRows, [4]);
});
