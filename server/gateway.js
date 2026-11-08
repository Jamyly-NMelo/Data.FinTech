import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { pipeline } from 'node:stream/promises';

const API_PATH = '/api';
const SESSION_COOKIE = '__Host-datafin.session';
const CSRF_COOKIE = '__Host-datafin.csrf';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const MAX_BODY_BYTES = 1024 * 1024;
const SESSION_ACTIONS = new Set(['auth.login', 'auth.verifyOtp', 'auth.googleLogin']);
const SESSION_RENEW_ACTION = 'auth.renew';
const MUTATION_METHOD = 'POST';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const sendJson = (response, status, body, headers = {}) => {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(JSON.stringify(body));
};

const readCookie = (header, name) => {
  for (const part of String(header || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
};

const cookieHeader = (token, maxAge = SESSION_MAX_AGE) => {
  const value = token ? encodeURIComponent(token) : '';
  return `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${token ? maxAge : 0}; HttpOnly; Secure; SameSite=Lax`;
};

const csrfCookieHeader = (token) =>
  `${CSRF_COOKIE}=${encodeURIComponent(token)}; Path=/; Secure; SameSite=Lax`;

const mergeHeaders = (...headersList) => {
  const headers = {};
  const cookies = [];
  for (const current of headersList) {
    if (!current) continue;
    for (const [name, value] of Object.entries(current)) {
      if (name.toLowerCase() === 'set-cookie') cookies.push(...(Array.isArray(value) ? value : [value]));
      else headers[name] = value;
    }
  }
  if (cookies.length) headers['Set-Cookie'] = cookies;
  return headers;
};

const validCsrfToken = (cookieToken, headerToken) => {
  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') return false;
  const cookie = Buffer.from(cookieToken);
  const header = Buffer.from(headerToken);
  return cookie.length === header.length && cookie.length > 0 && timingSafeEqual(cookie, header);
};

const readJsonBody = async (request) => {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Corpo da requisição excede o limite permitido.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('JSON inválido.');
    error.status = 400;
    throw error;
  }
};

const publicIdentity = (payload) => {
  const issuer = payload?.iss;
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(issuer)) {
    throw Object.assign(new Error('Emissor Google inválido.'), { status: 401 });
  }
  if (!payload.sub || !payload.email || payload.email_verified !== true) {
    throw Object.assign(new Error('A conta Google não possui e-mail verificado.'), { status: 401 });
  }
  if (!Number.isFinite(Number(payload.exp)) || Number(payload.exp) <= Date.now() / 1000) {
    throw Object.assign(new Error('Credencial Google expirada.'), { status: 401 });
  }
  return {
    google_sub: String(payload.sub),
    email: String(payload.email).trim().toLowerCase(),
    full_name: String(payload.name || ''),
    picture_url: String(payload.picture || ''),
    email_verified: true,
  };
};

const upstreamJson = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error('Resposta inválida do serviço de dados.'), { status: 502 });
  }
};

const serveStatic = async (request, response, distDirectory) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const requestedPath = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const target = resolve(distDirectory, requestedPath);
  const safeRoot = `${resolve(distDirectory)}${sep}`;
  const isAsset = target.startsWith(safeRoot) && existsSync(target);
  const file = isAsset ? target : resolve(distDirectory, 'index.html');

  if (!existsSync(file)) {
    sendJson(response, 404, { status: 'erro', mensagem: 'Aplicação não compilada.' });
    return;
  }
  response.writeHead(200, {
    'Cache-Control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'Content-Type': MIME_TYPES[extname(file)] || 'application/octet-stream',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' https://accounts.google.com/gsi/client",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https://lh3.googleusercontent.com",
      "connect-src 'self' https://accounts.google.com/gsi/",
      "frame-src https://accounts.google.com/gsi/",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });
  await pipeline(createReadStream(file), response);
};

export function createGateway({
  appScriptUrl,
  gatewaySecret,
  googleClientId,
  allowedOrigins = [],
  verifyGoogleToken,
  fetchImpl = fetch,
  distDirectory = resolve(process.cwd(), 'dist'),
}) {
  if (!appScriptUrl || !gatewaySecret || !googleClientId || !verifyGoogleToken) {
    throw new Error('Configuração obrigatória ausente para o gateway.');
  }
  const gasUrl = new URL(appScriptUrl);
  if (
    gasUrl.protocol !== 'https:' ||
    gasUrl.hostname !== 'script.google.com' ||
    !/^\/macros\/s\/[^/]+\/exec$/.test(gasUrl.pathname)
  ) {
    throw new Error('APPS_SCRIPT_URL precisa apontar para um Web App /exec do Apps Script.');
  }

  const allowed = new Set(allowedOrigins);
  const sendUpstream = async (method, payload, query) => {
    const requestPayload = method === 'GET' ? { ...query, ...payload } : payload;
    const response = await fetchImpl(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...requestPayload, gateway_secret: gatewaySecret }),
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });
    return upstreamJson(response);
  };

  return async (request, response) => {
    try {
      if (request.url.startsWith(`${API_PATH}?`) || request.url === API_PATH) {
        if (request.method !== 'GET' && request.method !== MUTATION_METHOD) {
          sendJson(response, 405, { status: 'erro', mensagem: 'Método não permitido.' }, { Allow: 'GET, POST' });
          return;
        }

        const requestCookies = request.headers.cookie;
        const csrfToken = readCookie(requestCookies, CSRF_COOKIE) || randomBytes(32).toString('base64url');
        const csrfHeaders = readCookie(requestCookies, CSRF_COOKIE)
          ? {}
          : { 'Set-Cookie': csrfCookieHeader(csrfToken) };
        const sendApiJson = (status, body, headers = {}) =>
          sendJson(response, status, body, mergeHeaders(csrfHeaders, headers));

        const requestUrl = new URL(request.url, 'http://localhost');
        const query = Object.fromEntries(requestUrl.searchParams.entries());
        delete query.access_token;
        delete query.gateway_secret;
        let payload = request.method === MUTATION_METHOD ? await readJsonBody(request) : {};
        const action = String(payload.action || query.action || '');

        if (request.method === MUTATION_METHOD) {
          const origin = request.headers.origin;
          if (!origin || !allowed.has(origin)) {
            sendApiJson(403, { status: 'erro', mensagem: 'Origem não autorizada.', httpStatus: 403 });
            return;
          }
          if (!validCsrfToken(readCookie(requestCookies, CSRF_COOKIE), request.headers['x-csrf-token'])) {
            sendApiJson(403, { status: 'erro', mensagem: 'Validação CSRF inválida.', httpStatus: 403 });
            return;
          }
        }

        const sessionToken = readCookie(requestCookies, SESSION_COOKIE);
        const setCookie = (token) => ({ 'Set-Cookie': cookieHeader(token) });

        if (action === 'auth.googleLogin') {
          const credential = payload.credential;
          if (typeof credential !== 'string' || credential.length > 20000) {
            sendApiJson(400, { status: 'erro', mensagem: 'Credencial Google inválida.', httpStatus: 400 });
            return;
          }
          const claims = publicIdentity(await verifyGoogleToken(credential, googleClientId));
          payload = { action, ...claims };
        } else {
          delete payload.access_token;
          delete payload.gateway_secret;
        }

        const upstreamPayload = {
          ...payload,
          ...(sessionToken ? { access_token: sessionToken } : {}),
        };
        const result = await sendUpstream(request.method, upstreamPayload, query);
        if (!result || !['sucesso', 'erro'].includes(result.status)) {
          sendApiJson(502, { status: 'erro', mensagem: 'Resposta inválida do serviço de dados.', httpStatus: 502 });
          return;
        }

        const isError = result.status === 'erro';
        const status = Number(result.httpStatus) || (isError ? 400 : 200);
        const data = result.data;
        if (isError) {
          const headers = status === 401 ? setCookie(null) : {};
          sendApiJson(status, result, headers);
          return;
        }

        let headers = {};
        let responseData = data;
        if (SESSION_ACTIONS.has(action)) {
          if (typeof data?.access_token !== 'string' || data.access_token.length < 32) {
            sendApiJson(502, { status: 'erro', mensagem: 'O serviço de autenticação não criou uma sessão.', httpStatus: 502 });
            return;
          }
          headers = setCookie(data.access_token);
          responseData = { ...data };
          delete responseData.access_token;
        } else if (action === SESSION_RENEW_ACTION) {
          if (!sessionToken) {
            sendApiJson(502, { status: 'erro', mensagem: 'Não foi possível renovar a sessão.', httpStatus: 502 });
            return;
          }
          headers = setCookie(sessionToken);
        } else if (action === 'auth.logout') {
          headers = setCookie(null);
        }
        sendApiJson(200, { status: 'sucesso', data: responseData }, headers);
        return;
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        sendJson(response, 405, { status: 'erro', mensagem: 'Método não permitido.' }, { Allow: 'GET, HEAD' });
        return;
      }
      await serveStatic(request, response, distDirectory);
    } catch (error) {
      const status = Number(error.status) || 502;
      const isApiRequest = request.url === API_PATH || request.url.startsWith(`${API_PATH}?`);
      if (isApiRequest && status === 401) {
        console.warn('Requisição de autenticação rejeitada no gateway.');
      } else if (status >= 500) {
        console.error('Falha ao processar requisição no gateway.');
      }
      sendJson(response, status, {
        status: 'erro',
        mensagem: status === 502 ? 'Não foi possível concluir a operação com segurança.' : error.message,
        httpStatus: status,
      }, status === 401 ? { 'Set-Cookie': cookieHeader(null) } : {});
    }
  };
}

export { SESSION_COOKIE, SESSION_MAX_AGE, publicIdentity, readCookie, readJsonBody };
