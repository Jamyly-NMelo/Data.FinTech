// @ts-nocheck
// Cliente do backend (Google Apps Script). A URL da implantação (termina em /exec) vem do .env.local:
//   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/SEU_ID/exec
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;
const TOKEN_STORAGE_KEY = 'datafin.access_token';
const REQUEST_TIMEOUT_MS = 30000; // o site nunca fica esperando para sempre

// Ações que devolvem um novo access_token: o cliente guarda sozinho, sem depender da tela.
const TOKEN_ACTIONS = new Set(['auth.login', 'auth.googleLogin', 'auth.verifyOtp']);
// Um 401 nestas ações não significa "sessão expirada".
const NO_EXPIRY_EVENT = new Set([
  'auth.login', 'auth.googleLogin', 'auth.register', 'auth.verifyOtp', 'auth.resendOtp',
  'auth.resetPasswordRequest', 'auth.resetPassword', 'auth.logout', 'auth.publicSettings',
]);

export const getAccessToken = () => {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const setAccessToken = (token) => {
  try {
    if (typeof localStorage === 'undefined') return;
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* navegador bloqueou o armazenamento */
  }
};

export const clearAccessToken = () => setAccessToken(null);

// Faz a chamada com tempo limite e só aceita JSON como resposta.
async function fetchJson(input, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const resposta = await fetch(input, { ...init, signal: controller.signal });
    const texto = await resposta.text();
    try {
      return JSON.parse(texto);
    } catch {
      throw new Error(
        'O servidor respondeu em formato inesperado. Confira a implantação do Apps Script ' +
          '(endereço terminado em /exec, acesso "Qualquer pessoa" e Nova versão).'
      );
    }
  } catch (erro) {
    if (erro.name === 'AbortError') throw new Error('O servidor demorou demais para responder. Tente novamente.');
    throw erro;
  } finally {
    clearTimeout(timer);
  }
}

// Todas as chamadas vão por POST: o token de sessão fica no corpo da requisição,
// e não na URL (onde apareceria em históricos e registros).
async function enviar(acao, dados) {
  try {
    if (!APPS_SCRIPT_URL) throw new Error('VITE_APPS_SCRIPT_URL não está definida no .env.local');
    const accessToken = getAccessToken();
    const corpo = { ...dados, action: acao, ...(accessToken ? { access_token: accessToken } : {}) };
    return await fetchJson(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(corpo),
    });
  } catch (erro) {
    console.error('Erro ao falar com o Apps Script:', erro.message);
    return { status: 'erro', mensagem: erro.message };
  }
}

export const api = {
  async obterDados(acao = 'listar', parametros = {}) {
    return enviar(acao, parametros);
  },
  async salvarDados(dados = {}) {
    const { action, ...resto } = dados;
    return enviar(action, resto);
  },
  // Leitura do PDF no navegador: o arquivo nunca sai do seu computador.
  async enviarFaturaPdf(file) {
    if (!file || file.size < 1 || file.size > 10 * 1024 * 1024) {
      throw new Error('Selecione um PDF com até 10 MiB.');
    }
    const { extractInvoicePdf } = await import('@/lib/finance/pdf-extract');
    return extractInvoicePdf(await file.arrayBuffer());
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

async function chamar(action, payload) {
  const tinhaToken = Boolean(getAccessToken());
  const bruto = await enviar(action, payload);
  let dados;
  try {
    dados = unwrapResult(bruto);
  } catch (erro) {
    // Token vencido ou inválido: avisa o app para encerrar a sessão e voltar ao login.
    if (tinhaToken && erro.status === 401 && !NO_EXPIRY_EVENT.has(action) && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('datafin:session-expired'));
    }
    throw erro;
  }
  if (TOKEN_ACTIONS.has(action) && dados?.access_token) setAccessToken(dados.access_token);
  return dados;
}

export async function get(action = 'listar', params = {}) {
  return chamar(action, params);
}

export async function post(action, payload = {}) {
  return chamar(action, payload);
}

api.get = get;
api.post = post;

export default api;
