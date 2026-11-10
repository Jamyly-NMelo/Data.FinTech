import { useEffect } from 'react';
import { getCanonicalUrl, SITE_CONFIG } from '@/config/site';

const DEFAULT_TITLE = `${SITE_CONFIG.name} — Finanças simples para quem quer focar no que importa`;
const DEFAULT_DESCRIPTION =
  `${SITE_CONFIG.name} — Finanças simples para quem quer focar no que importa. Gestão financeira pessoal, empresarial e de investimentos em uma única visão.`;

function setMeta(attribute, key, content) {
  let node = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attribute, key);
    document.head.appendChild(node);
  }
  if (content == null) {
    node.remove();
    return;
  }
  node.setAttribute('content', content);
}

function setCanonical(href) {
  let node = document.head.querySelector('link[rel="canonical"]');
  if (!href) {
    if (node) node.remove();
    return;
  }
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', 'canonical');
    document.head.appendChild(node);
  }
  node.setAttribute('href', href);
}

/**
 * Define título, descrição e endereço canônico da página pública atual.
 * `noindex` é usado em conteúdo inexistente, para não indexar tela de erro.
 */
export function usePageMeta({ title, description, path, noindex = false }) {
  useEffect(() => {
    const pageTitle = title ? `${title} · ${SITE_CONFIG.name}` : DEFAULT_TITLE;
    const pageDescription = description || DEFAULT_DESCRIPTION;
    const canonicalUrl = noindex ? null : getCanonicalUrl(path || window.location.pathname);

    document.title = pageTitle;
    setMeta('name', 'description', pageDescription);
    setMeta('property', 'og:title', pageTitle);
    setMeta('property', 'og:site_name', SITE_CONFIG.name);
    setMeta('property', 'og:description', pageDescription);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('name', 'twitter:title', pageTitle);
    setMeta('name', 'twitter:description', pageDescription);
    setMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow');
    // Conteúdo inexistente não recebe endereço canônico.
    setCanonical(canonicalUrl);

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('name', 'description', DEFAULT_DESCRIPTION);
      setMeta('property', 'og:title', DEFAULT_TITLE);
      setMeta('property', 'og:site_name', SITE_CONFIG.name);
      setMeta('property', 'og:description', DEFAULT_DESCRIPTION);
      const currentCanonicalUrl = getCanonicalUrl(window.location.pathname);
      setMeta('property', 'og:url', currentCanonicalUrl);
      setMeta('name', 'twitter:title', DEFAULT_TITLE);
      setMeta('name', 'twitter:description', DEFAULT_DESCRIPTION);
      setMeta('name', 'robots', 'index, follow');
      setCanonical(currentCanonicalUrl);
    };
  }, [title, description, path, noindex]);
}