const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjwSYU2LDVw1uDdcXUPDZkW70ruRqd5sBJFxxL_jWwgo9IBFyG-EYPiGv1FPdlh37-RQ/exec';
const TOKEN_STORAGE_KEY = 'datafin.access_token';

export const getAccessToken = () => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

export const setAccessToken = (token) => {
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const clearAccessToken = () => setAccessToken(null);

const queryValue = (value) => (typeof value === 'string' ? value : JSON.stringify(value));

export const api = {
  async obterDados(acao = 'listar', parametros = {}) {
    try {
      const url = new URL(APPS_SCRIPT_URL);
      url.searchParams.set('action', acao);
      Object.entries(parametros).forEach(([chave, valor]) => {
        if (valor !== undefined && valor !== null) url.searchParams.set(chave, queryValue(valor));
      });
      const accessToken = getAccessToken();
      if (accessToken) url.searchParams.set('access_token', accessToken);
      const resposta = await fetch(url);
      return await resposta.json();
    } catch (erro) {
      console.error('Erro ao buscar dados do Apps Script:', erro);
      return { status: 'erro', mensagem: erro.message };
    }
  },

  async salvarDados(dados) {
    try {
      const resposta = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(dados),
      });
      return await resposta.json();
    } catch (erro) {
      console.error('Erro ao enviar dados para o Apps Script:', erro);
      return { status: 'erro', mensagem: erro.message };
    }
  },
};

const unwrapResult = (result) => {
  if (result?.status === 'erro' || result?.error) {
    const message = result.mensagem || result.error?.message || result.error || 'Falha ao comunicar com o Apps Script.';
    const error = new Error(message);
    error.status = result.httpStatus || result.statusCode;
    error.data = result;
    throw error;
  }
  return result && Object.hasOwn(result, 'data') ? result.data : result;
};

export async function get(action = 'listar', params = {}) {
  return unwrapResult(await api.obterDados(action, params));
}

export async function post(action, payload = {}) {
  const accessToken = getAccessToken();
  const body = { ...payload, action, ...(accessToken ? { access_token: accessToken } : {}) };
  return unwrapResult(await api.salvarDados(body));
}

api.get = get;
api.post = post;

export default api;