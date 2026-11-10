import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiProxy } from '../netlify/functions/api.mjs';

const CLOUD_RUN_URL = 'https://data-fintech-abc.run.app';

test('proxy encaminha API, query, cookie, origem e CSRF preservando cookies de sessão', async () => {
  let forwarded;
  const proxy = createApiProxy({
    cloudRunUrl: CLOUD_RUN_URL,
    fetchImpl: async (url, options) => {
      forwarded = { url: new URL(url), options };
      return new Response('{"status":"sucesso"}', {
        status: 201,
        headers: [
          ['content-type', 'application/json; charset=utf-8'],
          ['set-cookie', '__Host-datafin.session=abc; HttpOnly; Secure; SameSite=Lax'],
          ['set-cookie', '__Host-datafin.csrf=xyz; Secure; SameSite=Lax'],
        ],
      });
    },
  });

  const response = await proxy(new Request('https://datafintech.netlify.app/api?action=records.list', {
    headers: {
      Cookie: '__Host-datafin.session=abc',
      Origin: 'https://datafintech.netlify.app',
      'X-CSRF-Token': 'csrf',
    },
  }));
  const cookies = response.headers.getSetCookie();

  assert.equal(response.status, 201);
  assert.equal(forwarded.url.href, `${CLOUD_RUN_URL}/api?action=records.list`);
  assert.equal(forwarded.options.headers.get('cookie'), '__Host-datafin.session=abc');
  assert.equal(forwarded.options.headers.get('origin'), 'https://datafintech.netlify.app');
  assert.equal(forwarded.options.headers.get('x-csrf-token'), 'csrf');
  assert.equal(cookies.length, 2);
  assert.match(cookies[0], /HttpOnly/);
});

test('proxy encaminha upload ao endpoint correto e rejeita payload excessivo', async () => {
  let target;
  const proxy = createApiProxy({
    cloudRunUrl: CLOUD_RUN_URL,
    fetchImpl: async (url) => {
      target = new URL(url);
      return Response.json({ status: 'sucesso' });
    },
  });

  const response = await proxy(new Request('https://datafintech.netlify.app/api/invoices/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf', 'Content-Length': '8' },
    body: '%PDF-1.0',
  }));
  assert.equal(response.status, 200);
  assert.equal(target.pathname, '/api/invoices/parse');

  const oversized = await proxy(new Request('https://datafintech.netlify.app/api/invoices/parse', {
    method: 'POST',
    body: new Uint8Array(11 * 1024 * 1024 + 1),
  }));
  assert.equal(oversized.status, 413);
});

test('proxy falha de forma explícita se Cloud Run não estiver configurado ou não responder', async () => {
  const missing = await createApiProxy({ cloudRunUrl: '' })(new Request('https://example.test/api'));
  assert.equal(missing.status, 503);
  assert.equal((await missing.json()).status, 'erro');

  const unavailable = await createApiProxy({
    cloudRunUrl: CLOUD_RUN_URL,
    fetchImpl: async () => { throw new Error('offline'); },
  })(new Request('https://example.test/api'));
  assert.equal(unavailable.status, 502);
  assert.equal((await unavailable.json()).status, 'erro');
});
