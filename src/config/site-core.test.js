import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCanonicalUrl, createSiteConfig } from './site-core.js';

test('site config applies safe defaults and removes trailing slashes', () => {
  assert.deepEqual(createSiteConfig(), {
    url: 'https://datafintech.com.br',
    name: 'DataFintech',
    domain: 'datafintech.com.br',
  });
  assert.equal(createSiteConfig({ VITE_SITE_URL: 'https://example.test///' }).url, 'https://example.test');
});

test('site config rejects invalid protocols and uses configured app name', () => {
  assert.equal(createSiteConfig({ VITE_SITE_URL: 'javascript:alert(1)' }).url, 'https://datafintech.com.br');
  assert.equal(createSiteConfig({ VITE_SITE_NAME: 'DataFintech Demo' }).name, 'DataFintech Demo');
});

test('canonical URLs normalize slashes and use the canonical host', () => {
  assert.equal(buildCanonicalUrl('https://datafintech.com.br/', '/artigos/exemplo'), 'https://datafintech.com.br/artigos/exemplo');
  assert.equal(buildCanonicalUrl('https://datafintech.com.br///', '/'), 'https://datafintech.com.br/');
});
