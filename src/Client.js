const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_STORAGE_KEY = 'datafin.access_token';
const REQUEST_TIMEOUT_MS = 30000;

const clearLegacyToken = () => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // The gateway authenticates with an HttpOnly cookie, not local storage.
  }
};

clearLegacyToken();

export const getAccessToken = () => null;
export const setAccessToken = clearLegacyToken;
export const clearAccessToken = clearLegacyToken;

const queryValue = (value) => (typeof value === 'string' ? value : JSON.stringify(value));

const getCsrfToken = () => {
  if (typeof document === 'undefined') return '';
  const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith('__Host-datafin.csrf='));
  if (!entry) return '';
  try {
    return decodeURIComponent(entry.slice(entry.indexOf('=') + 1));
  } catch {
    return '';
  }
};

const apiUrl = () => {
  const url = new URL(API_URL, window.location.origin);
  if (url.origin !== window.location.origin || url.pathname !== '/api' || url.search || url.hash) {
    throw new Error('VITE_API_BASE_URL deve apontar para /api na mesma origem da aplicação.');
  }
  return url;
};

const fetchJson = async (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('O gateway respondeu em formato inválido. Verifique a implantação do serviço.');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('O servidor demorou demais para responder. Tente novamente.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

export const api = {
  async obterDados(acao = 'listar', parametros = {}) {
    try {
      const url = apiUrl();
      url.searchParams.set('action', acao);
      Object.entries(parametros).forEach(([chave, valor]) => {
        if (
          valor !== undefined &&
          valor !== null &&
          chave !== 'access_token' &&
          chave !== 'gateway_secret'
        ) {
          url.searchParams.set(chave, queryValue(valor));
        }
      });
      return await fetchJson(url, { credentials: 'same-origin' });
    } catch (error) {
      console.error('Erro ao consultar o gateway:', error.message);
      return { status: 'erro', mensagem: error.message };
    }
  },

  async salvarDados(dados) {
    try {
      if (!getCsrfToken()) {
        const bootstrap = await api.obterDados('auth.publicSettings');
        if (bootstrap?.status === 'erro' || !getCsrfToken()) {
          throw new Error(bootstrap?.mensagem || 'Não foi possível iniciar a proteção CSRF.');
        }
      }

      return await fetchJson(apiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify(dados),
        credentials: 'same-origin',
      });
    } catch (error) {
      console.error('Erro ao enviar dados ao gateway:', error.message);
      return { status: 'erro', mensagem: error.message };
    }
  },

  async enviarFaturaPdf(file) {
    try {
      if (!file || file.size < 1 || file.size > 10 * 1024 * 1024) {
        throw new Error('Selecione um PDF com até 10 MiB.');
      }
      if (!getCsrfToken()) {
        const bootstrap = await api.obterDados('auth.publicSettings');
        if (bootstrap?.status === 'erro' || !getCsrfToken()) {
          throw new Error(bootstrap?.mensagem || 'Não foi possível iniciar a proteção CSRF.');
        }
      }
      const url = apiUrl();
      url.pathname = `${url.pathname}/invoices/parse`;
      return unwrapResult(await fetchJson(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: file,
        credentials: 'same-origin',
      }), 'invoices.parse');
    } catch (error) {
      console.error('Erro ao extrair fatura em PDF:', error.message);
      throw error;
    }
  },
};

const unwrapResult = (result, action) => {
  if (result?.status === 'erro' || result?.error) {
    const message = result.mensagem || result.error?.message || result.error || 'Falha ao comunicar com o gateway.';
    const error = new Error(message);
    error.status = result.httpStatus || result.statusCode;
    error.data = result;
    if (error.status === 401 && !String(action).startsWith('auth.') && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('datafin:session-expired'));
    }
    throw error;
  }
  return result && Object.hasOwn(result, 'data') ? result.data : result;
};

export async function get(action = 'listar', params = {}) {
  return unwrapResult(await api.obterDados(action, params), action);
}

export async function post(action, payload = {}) {
  return unwrapResult(await api.salvarDados({ ...payload, action }), action);
}

api.get = get;
api.post = post;

export default api;
