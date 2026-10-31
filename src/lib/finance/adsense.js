import { getArticleBySlug } from '@/content/articles';

/**
 * Controle único do Google AdSense na aplicação.
 *
 * Regra de elegibilidade: anúncios só existem em páginas editoriais públicas
 * (artigos com conteúdo original). Nunca em painel, configurações, backup,
 * formulários, login, estados vazios, carregamento ou erro.
 */
export const ADSENSE_CLIENT_ID = 'ca-pub-8573045934415662';

/** Nenhum identificador de bloco de anúncio é inventado: enquanto não houver
 *  um bloco real criado no painel do AdSense, nenhuma unidade é renderizada. */
export const ADSENSE_SLOT = null;

const SCRIPT_SELECTOR = 'script[data-datafin-adsense="true"]';
const SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;

let loader = null;

/** Um artigo publicado e com conteúdo próprio é a única rota elegível. */
export function isAdEligiblePath(pathname) {
  const match = /^\/artigos\/([^/]+)\/?$/.exec(pathname || '');
  if (!match) return false;
  return Boolean(getArticleBySlug(match[1]));
}

/** Carrega o script do AdSense uma única vez em todo o aplicativo. */
export function loadAdSenseScript() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.resolve(false);
  if (loader) return loader;
  if (document.querySelector(SCRIPT_SELECTOR)) {
    loader = Promise.resolve(true);
    return loader;
  }

  loader = new Promise((resolve) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = SCRIPT_SRC;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-datafin-adsense', 'true');
    script.onload = () => resolve(true);
    script.onerror = () => {
      script.remove();
      loader = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return loader;
}