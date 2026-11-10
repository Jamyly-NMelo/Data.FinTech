const FUNCTION_PATH = '/.netlify/functions/api';
const MAX_PROXY_BODY_BYTES = 11 * 1024 * 1024;

const jsonError = (status, mensagem) =>
  Response.json({ status: 'erro', mensagem, httpStatus: status }, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });

const requestPath = (pathname) => {
  if (pathname === FUNCTION_PATH) return '';
  if (pathname.startsWith(`${FUNCTION_PATH}/`)) return pathname.slice(FUNCTION_PATH.length);
  if (pathname === '/api') return '';
  if (pathname.startsWith('/api/')) return pathname.slice('/api'.length);
  return null;
};

export function createApiProxy({ cloudRunUrl, fetchImpl = fetch }) {
  let upstream;
  try {
    upstream = new URL(cloudRunUrl);
  } catch {
    upstream = null;
  }
  const validUpstream = upstream?.protocol === 'https:' && upstream.pathname === '/' &&
    !upstream.search && !upstream.hash;

  return async (request) => {
    if (!validUpstream) {
      return jsonError(503, 'O gateway Cloud Run não está configurado.');
    }

    const incoming = new URL(request.url);
    const suffix = requestPath(incoming.pathname);
    if (suffix === null) return jsonError(404, 'Rota da API não encontrada.');
    if (!['GET', 'POST'].includes(request.method)) {
      return jsonError(405, 'Método não permitido.');
    }

    let body;
    if (request.method === 'POST') {
      const contentLength = Number(request.headers.get('content-length'));
      if (Number.isFinite(contentLength) && contentLength > MAX_PROXY_BODY_BYTES) {
        return jsonError(413, 'O arquivo excede o limite de envio.');
      }
      body = await request.arrayBuffer();
      if (body.byteLength > MAX_PROXY_BODY_BYTES) {
        return jsonError(413, 'O arquivo excede o limite de envio.');
      }
    }

    const headers = new Headers();
    for (const name of ['accept', 'content-type', 'cookie', 'origin', 'x-csrf-token']) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }

    const target = new URL(`/api${suffix}${incoming.search}`, upstream.origin);
    try {
      const response = await fetchImpl(target, {
        method: request.method,
        headers,
        ...(body ? { body } : {}),
        redirect: 'manual',
        signal: AbortSignal.timeout(30000),
      });
      const responseHeaders = new Headers();
      for (const name of ['content-type', 'cache-control', 'x-content-type-options', 'referrer-policy', 'x-frame-options']) {
        const value = response.headers.get(name);
        if (value) responseHeaders.set(name, value);
      }
      for (const cookie of response.headers.getSetCookie?.() || []) {
        responseHeaders.append('set-cookie', cookie);
      }
      responseHeaders.set('Cache-Control', 'no-store');
      responseHeaders.set('X-Content-Type-Options', 'nosniff');
      return new Response(response.body, { status: response.status, headers: responseHeaders });
    } catch {
      return jsonError(502, 'Não foi possível conectar ao gateway Cloud Run.');
    }
  };
}

export default async (request) =>
  createApiProxy({ cloudRunUrl: process.env.CLOUD_RUN_URL })(request);
