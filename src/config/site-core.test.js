import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCanonicalUrl, createSiteConfig } from './site-core.js';

test('site config uses the configured canonical URL and removes trailing slashes', () => {
  assert.deepEqual(createSiteConfig(), {
    url: '',
    name: 'DataFintech',
    domain: '',
  });
  assert.deepEqual(createSiteConfig({ VITE_SITE_URL: 'https://datafintech.netlify.app/' }), {
    url: 'https://datafintech.netlify.app',
    name: 'DataFintech',
    domain: 'datafintech.netlify.app',
  });
});

test('site config leaves canonical URL empty when the variable is absent', () => {
  assert.equal(createSiteConfig({ VITE_SITE_NAME: 'DataFintech Demo' }).url, '');
  assert.equal(createSiteConfig({}, 'http://localhost:5173').url, 'http://localhost:5173');
  assert.equal(createSiteConfig({}, 'http://127.0.0.1:4173').url, 'http://127.0.0.1:4173');
});

test('site config rejects invalid URLs and uses configured app name', () => {
  for (const VITE_SITE_URL of [
    'http://example.test',
    'https://example.test/app',
    'https://user:password@example.test',
    'https://example.test?query=1',
    'javascript:alert(1)',
  ]) {
    assert.equal(createSiteConfig({ VITE_SITE_URL }).url, '');
  }
  assert.equal(createSiteConfig({ VITE_SITE_NAME: 'DataFintech Demo' }).name, 'DataFintech Demo');
});

test('canonical URLs use the configured host and remain empty without a base URL', () => {
  assert.equal(buildCanonicalUrl('https://datafintech.netlify.app/', '/artigos/exemplo'), 'https://datafintech.netlify.app/artigos/exemplo');
  assert.equal(buildCanonicalUrl('https://datafintech.netlify.app///', '/'), 'https://datafintech.netlify.app/');
  assert.equal(buildCanonicalUrl('', '/artigos/exemplo'), '');
});
