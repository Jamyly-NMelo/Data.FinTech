import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { OAuth2Client } from 'google-auth-library';
import { createGateway } from './gateway.js';

const required = ['APPS_SCRIPT_URL', 'GATEWAY_SECRET', 'GOOGLE_CLIENT_ID'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  throw new Error(`Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`);
}

const allowedOrigins = String(process.env.ALLOWED_ORIGINS || process.env.PUBLIC_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
if (allowedOrigins.length === 0) {
  throw new Error('Configure ALLOWED_ORIGINS com as origens confiáveis do frontend.');
}

const oauthClient = new OAuth2Client();
const handler = createGateway({
  appScriptUrl: process.env.APPS_SCRIPT_URL,
  gatewaySecret: process.env.GATEWAY_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  allowedOrigins,
  verifyGoogleToken: async (idToken, audience) => {
    try {
      const ticket = await oauthClient.verifyIdToken({ idToken, audience });
      return ticket.getPayload();
    } catch {
      throw Object.assign(new Error('Credencial Google inválida ou expirada.'), { status: 401 });
    }
  },
  distDirectory: resolve(process.cwd(), 'dist'),
});

const server = createServer((request, response) => {
  handler(request, response).catch(() => {
    console.error('Falha não tratada ao processar requisição no gateway.');
    if (!response.headersSent) {
      response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    response.end(JSON.stringify({ status: 'erro', mensagem: 'Erro interno do gateway.', httpStatus: 500 }));
  });
});

server.listen(Number(process.env.PORT) || 8080, '0.0.0.0', () => {
  console.log(`Gateway iniciado na porta ${server.address().port}.`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
