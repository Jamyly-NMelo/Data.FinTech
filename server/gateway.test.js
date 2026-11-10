import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { createGateway, publicIdentity, SESSION_COOKIE } from './gateway.js';

const GAS_URL = 'https://script.google.com/macros/s/test-deployment/exec';
const GATEWAY_SECRET = 'test-secret-with-at-least-thirty-two-characters';
const GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
const ORIGIN = 'https://data-fintech.example';
const SESSION_TOKEN = 'a'.repeat(64);
const CSRF_TOKEN = 'csrf-token-with-sufficient-length';
const CSRF_COOKIE = '__Host-datafin.csrf';

const createHarness = async ({ fetchImpl, verifyGoogleToken, parsePdf } = {}) => {
  const upstreamRequests = [];
  const upstream = fetchImpl || (async (url, options) => {
    upstreamRequests.push({ url: new URL(url), options });
    const body = options.method === 'POST' ? JSON.parse(options.body) : null;
    const action = body?.action || new URL(url).searchParams.get('action');
    let data = { ok: true };
    if (['auth.login', 'auth.verifyOtp', 'auth.googleLogin'].includes(action)) {
      data = { access_token: SESSION_TOKEN, user: { id: 'user-1', email: 'user@example.com' } };
    }
    if (action === 'auth.renew') data = { ok: true, expires_at: Date.now() + 30 * 86400000 };
    if (action === 'auth.me') data = { id: 'user-1', email: 'user@example.com' };
    return Response.json({ status: 'sucesso', data });
  });
  const server = createServer(createGateway({
    appScriptUrl: GAS_URL,
    gatewaySecret: GATEWAY_SECRET,
    googleClientId: GOOGLE_CLIENT_ID,
    allowedOrigins: [ORIGIN],
    verifyGoogleToken: verifyGoogleToken || (async () => ({
      iss: 'https://accounts.google.com',
      sub: 'google-sub-1',
      aud: GOOGLE_CLIENT_ID,
      email: 'user@example.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 60,
      name: 'Test User',
      picture: 'https://lh3.googleusercontent.com/a/test',
    })),
    fetchImpl: upstream,
    parsePdf,
  }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    baseUrl,
    upstreamRequests,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
};

const postJson = (baseUrl, body, headers = {}) =>
  fetch(`${baseUrl}/api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      Cookie: `${CSRF_COOKIE}=${CSRF_TOKEN}`,
      'X-CSRF-Token': CSRF_TOKEN,
      ...headers,
    },
    body: JSON.stringify(body),
  });

test('login armazena o token apenas em cookie HttpOnly e não o devolve ao JavaScript', async (t) => {
  const harness = await createHarness();
  t.after(harness.close);
  const response = await postJson(harness.baseUrl, { action: 'auth.login', email: 'user@example.com', password: 'pass' });
  const result = await response.json();
  const cookie = response.headers.get('set-cookie');

  assert.equal(response.status, 200);
  assert.equal(result.status, 'sucesso');
  assert.equal(result.data.access_token, undefined);
  assert.match(cookie, new RegExp(`${SESSION_COOKIE}=${SESSION_TOKEN}`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.equal(harness.upstreamRequests[0].options.body.includes(SESSION_TOKEN), false);
  assert.equal(harness.upstreamRequests[0].options.body.includes(GATEWAY_SECRET), true);
});

test('login Google valida as claims e só envia identidade validada ao Apps Script', async (t) => {
  let observedAudience;
  const harness = await createHarness({
    verifyGoogleToken: async (credential, audience) => {
      assert.equal(credential, 'signed-google-id-token');
      observedAudience = audience;
      return {
        iss: 'https://accounts.google.com',
        sub: 'google-sub-1',
        aud: audience,
        email: 'user@example.com',
        email_verified: true,
        exp: Math.floor(Date.now() / 1000) + 60,
        name: 'Test User',
        picture: 'https://lh3.googleusercontent.com/a/test',
      };
    },
  });
  t.after(harness.close);
  const response = await postJson(harness.baseUrl, {
    action: 'auth.googleLogin',
    credential: 'signed-google-id-token',
    google_sub: 'spoofed-sub',
    email: 'attacker@example.com',
  });
  const result = await response.json();
  const forwarded = JSON.parse(harness.upstreamRequests[0].options.body);

  assert.equal(response.status, 200);
  assert.equal(observedAudience, GOOGLE_CLIENT_ID);
  assert.equal(result.data.access_token, undefined);
  assert.equal(forwarded.google_sub, 'google-sub-1');
  assert.equal(forwarded.email, 'user@example.com');
  assert.equal(forwarded.email_verified, true);
  assert.equal(forwarded.credential, undefined);
  assert.equal(forwarded.gateway_secret, GATEWAY_SECRET);
});

test('requisições de leitura enviam token de cookie ao Apps Script somente no corpo POST', async (t) => {
  const harness = await createHarness();
  t.after(harness.close);
  const response = await fetch(`${harness.baseUrl}/api?action=records.list&entity=Account&access_token=forged`, {
    headers: { Cookie: `${SESSION_COOKIE}=${SESSION_TOKEN}` },
  });
  const upstreamUrl = harness.upstreamRequests[0].url;
  const upstreamBody = JSON.parse(harness.upstreamRequests[0].options.body);

  assert.equal(response.status, 200);
  assert.equal(harness.upstreamRequests[0].options.method, 'POST');
  assert.equal(upstreamUrl.searchParams.has('access_token'), false);
  assert.equal(upstreamUrl.searchParams.has('gateway_secret'), false);
  assert.equal(upstreamBody.access_token, SESSION_TOKEN);
  assert.equal(upstreamBody.gateway_secret, GATEWAY_SECRET);
  assert.equal(upstreamBody.entity, 'Account');
});

test('requisição sem cookie ignora access_token fornecido pelo navegador', async (t) => {
  const harness = await createHarness();
  t.after(harness.close);
  const response = await fetch(`${harness.baseUrl}/api?action=records.list&entity=Account&access_token=forged`);
  const upstreamBody = JSON.parse(harness.upstreamRequests[0].options.body);

  assert.equal(response.status, 200);
  assert.equal(upstreamBody.access_token, undefined);
  assert.equal(upstreamBody.gateway_secret, GATEWAY_SECRET);
});

test('GET inicial define cookie CSRF acessível apenas à origem do aplicativo', async (t) => {
  const harness = await createHarness();
  t.after(harness.close);
  const response = await fetch(`${harness.baseUrl}/api?action=auth.publicSettings`);
  const cookie = response.headers.get('set-cookie');

  assert.equal(response.status, 200);
  assert.match(cookie, new RegExp(`${CSRF_COOKIE}=`));
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /HttpOnly/);
});

test('origem diferente é bloqueada antes de chamar o Apps Script', async (t) => {
  const harness = await createHarness();
  t.after(harness.close);
  const response = await postJson(harness.baseUrl, { action: 'auth.login' }, { Origin: 'https://attacker.example' });
  const result = await response.json();

  assert.equal(response.status, 403);
  assert.equal(result.status, 'erro');
  assert.equal(harness.upstreamRequests.length, 0);
});

test('POST sem par CSRF cookie/header correspondente é bloqueado antes do Apps Script', async (t) => {
  const harness = await createHarness();
  t.after(harness.close);
  const response = await postJson(
    harness.baseUrl,
    { action: 'records.create', entity: 'Account' },
    { 'X-CSRF-Token': 'forged-token' },
  );
  const result = await response.json();

  assert.equal(response.status, 403);
  assert.match(result.mensagem, /CSRF/);
  assert.equal(harness.upstreamRequests.length, 0);
});

test('upload PDF exige sessão autenticada e CSRF e nunca encaminha bytes ao Apps Script', async (t) => {
  let parsedBytes;
  const harness = await createHarness({
    parsePdf: async (bytes) => {
      parsedBytes = Buffer.from(bytes).toString();
      return { institution: 'Banco teste', items: [{ description: 'Compra', amount: '10,00' }] };
    },
  });
  t.after(harness.close);
  const headers = {
    'Content-Type': 'application/pdf',
    Origin: ORIGIN,
    Cookie: `${SESSION_COOKIE}=${SESSION_TOKEN}; ${CSRF_COOKIE}=${CSRF_TOKEN}`,
    'X-CSRF-Token': CSRF_TOKEN,
  };
  const response = await fetch(`${harness.baseUrl}/api/invoices/parse`, {
    method: 'POST',
    headers,
    body: '%PDF-test',
  });
  const result = await response.json();
  const authRequest = JSON.parse(harness.upstreamRequests[0].options.body);

  assert.equal(response.status, 200);
  assert.equal(result.data.institution, 'Banco teste');
  assert.equal(parsedBytes, '%PDF-test');
  assert.equal(authRequest.action, 'auth.me');
  assert.equal(authRequest.access_token, SESSION_TOKEN);
  assert.equal(authRequest.gateway_secret, GATEWAY_SECRET);

  const unauthenticated = await fetch(`${harness.baseUrl}/api/invoices/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      Origin: ORIGIN,
      Cookie: `${CSRF_COOKIE}=${CSRF_TOKEN}`,
      'X-CSRF-Token': CSRF_TOKEN,
    },
    body: '%PDF-test',
  });
  assert.equal(unauthenticated.status, 401);
  assert.equal(harness.upstreamRequests.length, 1);
});

test('renovação estende a sessão persistida sem expor o token ao navegador', async (t) => {
  const harness = await createHarness();
  t.after(harness.close);
  const response = await postJson(
    harness.baseUrl,
    { action: 'auth.renew' },
    { Cookie: `${SESSION_COOKIE}=${SESSION_TOKEN}; ${CSRF_COOKIE}=${CSRF_TOKEN}` },
  );
  const body = await response.json();
  const upstreamBody = JSON.parse(harness.upstreamRequests[0].options.body);

  assert.equal(response.status, 200);
  assert.equal(body.data.access_token, undefined);
  assert.equal(upstreamBody.access_token, SESSION_TOKEN);
  assert.match(response.headers.get('set-cookie'), new RegExp(`${SESSION_COOKIE}=${SESSION_TOKEN}`));
});

test('logout encaminha a sessão persistida e expira o cookie HttpOnly', async (t) => {
  const harness = await createHarness();
  t.after(harness.close);
  const response = await postJson(
    harness.baseUrl,
    { action: 'auth.logout' },
    { Cookie: `${SESSION_COOKIE}=${SESSION_TOKEN}; ${CSRF_COOKIE}=${CSRF_TOKEN}` },
  );
  const upstreamBody = JSON.parse(harness.upstreamRequests[0].options.body);

  assert.equal(response.status, 200);
  assert.equal(upstreamBody.access_token, SESSION_TOKEN);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
});

test('sessão expirada limpa o cookie HttpOnly', async (t) => {
  const harness = await createHarness({
    fetchImpl: async () => Response.json(
      { status: 'erro', mensagem: 'Autenticação necessária.', httpStatus: 401 },
      { status: 401 },
    ),
  });
  t.after(harness.close);
  const response = await fetch(`${harness.baseUrl}/api?action=auth.me`, {
    headers: { Cookie: `${SESSION_COOKIE}=${SESSION_TOKEN}` },
  });

  assert.equal(response.status, 401);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
});

test('claims Google rejeitam emissor, email não verificado e token expirado', () => {
  const valid = {
    iss: 'https://accounts.google.com',
    sub: 'google-sub',
    email: 'user@example.com',
    email_verified: true,
    exp: Math.floor(Date.now() / 1000) + 60,
  };
  assert.equal(publicIdentity(valid).email, 'user@example.com');
  assert.throws(() => publicIdentity({ ...valid, iss: 'https://attacker.example' }), /Emissor Google inválido/);
  assert.throws(() => publicIdentity({ ...valid, email_verified: false }), /e-mail verificado/);
  assert.throws(() => publicIdentity({ ...valid, exp: 1 }), /expirada/);
});
