export const DEFAULT_SITE_NAME = 'DataFintech';

function parseSiteUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const isSecure = url.protocol === 'https:';
    const isLocalDevelopment = url.protocol === 'http:' && isLocalhost;

    if (
      (!isSecure && !isLocalDevelopment) ||
      url.username ||
      url.password ||
      (url.pathname !== '/' && url.pathname !== '') ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export function createSiteConfig(env = {}, developmentOrigin = '') {
  const configuredUrl = typeof env.VITE_SITE_URL === 'string' ? env.VITE_SITE_URL.trim() : '';
  const siteUrl = parseSiteUrl(configuredUrl || developmentOrigin);
  const configuredName = typeof env.VITE_SITE_NAME === 'string' ? env.VITE_SITE_NAME.trim() : '';

  return {
    url: siteUrl?.origin || '',
    name: configuredName || DEFAULT_SITE_NAME,
    domain: siteUrl?.hostname || '',
  };
}

export function buildCanonicalUrl(baseUrl, path = '') {
  const normalizedBase = String(baseUrl || '').replace(/\/+$/, '');
  if (!normalizedBase) return '';

  const rawPath = String(path || '').trim();
  if (!rawPath) return normalizedBase;

  const normalizedPath = rawPath.replace(/^\/+/, '');
  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : `${normalizedBase}/`;
}
