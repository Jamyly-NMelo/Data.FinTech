const TOKEN_STORAGE_KEY = 'datafin.access_token';

const getEndpoint = () => {
  const endpoint = import.meta.env.VITE_APPS_SCRIPT_URL;
  if (!endpoint) {
    throw new Error('Configure VITE_APPS_SCRIPT_URL com a URL publicada do Google Apps Script.');
  }
  return endpoint;
};

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

const encodeQueryValue = (value) =>
  typeof value === 'string' ? value : JSON.stringify(value);

const parseResponse = async (response) => {
  const text = await response.text();
  let result;

  try {
    result = text ? JSON.parse(text) : null;
  } catch {
    throw new Error('O Google Apps Script retornou uma resposta inválida.');
  }

  if (!response.ok || result?.error) {
    const message =
      (typeof result?.error === 'string' ? result.error : result?.error?.message) ||
      result?.message ||
      `Falha na API (${response.status}).`;
    const error = new Error(message);
    error.status = result?.status || response.status;
    error.data = result;
    throw error;
  }

  return result && Object.hasOwn(result, 'data') ? result.data : result;
};

export async function get(action, params = {}) {
  const url = new URL(getEndpoint());
  url.searchParams.set('action', action);

  const accessToken = getAccessToken();
  const query = { ...params, ...(accessToken ? { access_token: accessToken } : {}) };
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, encodeQueryValue(value));
  });

  return parseResponse(await fetch(url));
}

export async function post(action, payload = {}) {
  const accessToken = getAccessToken();
  const body = { ...payload, action, ...(accessToken ? { access_token: accessToken } : {}) };
  const response = await fetch(getEndpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });

  return parseResponse(response);
}

const api = { get, post };

export default api;