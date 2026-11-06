const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_STORAGE_KEY = 'datafin.access_token';

const clearLegacyToken = () => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // O gateway não depende de armazenamento local para autenticar.
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

export const api = {
  async obterDados(acao = 'listar', parametros = {}) {
    try {
      if (!API_URL) throw new Error('VITE_API_BASE_URL não está definida.');
      const url = apiUrl();
      url.searchParams.set('action', acao);
      Object.entries(parametros).forEach(([chave, valor]) => {
        if (valor !== undefined && valor !== null) url.searchParams.set(chave, queryValue(valor));
      });
      const resposta = await fetch(url, { credentials: 'same-origin' });
      return await resposta.json();
    } catch (erro) {
      console.error('Erro ao buscar dados do Apps Script:', erro);
      return { status: 'erro', mensagem: erro.message };
    }
  },

  async salvarDados(dados) {
    try {
      if (!API_URL) throw new Error('VITE_API_BASE_URL não está definida.');
      if (!getCsrfToken()) {
        const bootstrap = await api.obterDados('auth.publicSettings');
        if (bootstrap?.status === 'erro' || !getCsrfToken()) {
          throw new Error(bootstrap?.mensagem || 'Não foi possível iniciar a proteção CSRF.');
        }
      }
      const resposta = await fetch(apiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify(dados),
        credentials: 'same-origin',
      });
      return await resposta.json();
    } catch (erro) {
      console.error('Erro ao enviar dados para o Apps Script:', erro);
      return { status: 'erro', mensagem: erro.message };
    }
  },
};

const unwrapResult = (result, action) => {
  if (result?.status === 'erro' || result?.error) {
    const message = result.mensagem || result.error?.message || result.error || 'Falha ao comunicar com o Apps Script.';
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