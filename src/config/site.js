import { buildCanonicalUrl, createSiteConfig } from './site-core.js';

export const SITE_CONFIG = createSiteConfig(import.meta.env);

export function getCanonicalUrl(path = '') {
  return buildCanonicalUrl(SITE_CONFIG.url, path);
}
