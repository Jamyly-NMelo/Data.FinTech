export const DEFAULT_SITE_URL = 'https://datafintech.com.br';
export const DEFAULT_SITE_NAME = 'DataFintech';
export const SITE_DOMAIN = 'datafintech.com.br';

export function createSiteConfig(env = {}) {
  const configuredUrl = typeof env.VITE_SITE_URL === 'string' ? env.VITE_SITE_URL.trim() : '';
  let url = configuredUrl || DEFAULT_SITE_URL;

  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) url = DEFAULT_SITE_URL;
  } catch {
    url = DEFAULT_SITE_URL;
  }

  url = url.replace(/\/+$/, '') || DEFAULT_SITE_URL;
  const configuredName = typeof env.VITE_SITE_NAME === 'string' ? env.VITE_SITE_NAME.trim() : '';

  return {
    url,
    name: configuredName || DEFAULT_SITE_NAME,
    domain: SITE_DOMAIN,
  };
}

export function buildCanonicalUrl(baseUrl, path = '') {
  const rawPath = String(path || '').trim();
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  if (!rawPath) return normalizedBase;

  const normalizedPath = rawPath.replace(/^\/+/, '');
  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : `${normalizedBase}/`;
}
