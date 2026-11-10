import { buildCanonicalUrl, createSiteConfig } from './site-core.js';

const developmentOrigin = import.meta.env.DEV && typeof window !== 'undefined'
  ? window.location.origin
  : '';

const siteEnvironment = import.meta.env.DEV
  ? { VITE_SITE_NAME: import.meta.env.VITE_SITE_NAME }
  : import.meta.env;

export const SITE_CONFIG = createSiteConfig(siteEnvironment, developmentOrigin);

export function getCanonicalUrl(path = '') {
  return buildCanonicalUrl(SITE_CONFIG.url, path);
}
