import { fileURLToPath, URL } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { createSiteConfig } from './src/config/site-core.js';

const publicMetadata = {
  '/robots.txt': { fileName: 'robots.txt', contentType: 'text/plain; charset=utf-8' },
  '/sitemap.xml': { fileName: 'sitemap.xml', contentType: 'application/xml; charset=utf-8' },
  '/manifest.json': { fileName: 'manifest.json', contentType: 'application/manifest+json; charset=utf-8' },
};

function siteConfigPlugin() {
  let root = process.cwd();
  let outDir = resolve(root, 'dist');
  let siteConfig = createSiteConfig();
  let hasConfiguredSiteUrl = false;

  const renderPublicFile = async (fileName, config = siteConfig) => {
    const template = await readFile(resolve(root, 'public', fileName), 'utf8');
    const encodedName = JSON.stringify(config.name).slice(1, -1);
    return template
      .replaceAll('__SITE_URL__', config.url)
      .replaceAll('__SITE_NAME__', encodedName);
  };
  const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

  return {
    name: 'site-config',
    config(_config, { mode }) {
      const env = loadEnv(mode, root, 'VITE_');
      const isDevelopment = mode === 'development';
      hasConfiguredSiteUrl = !isDevelopment && Boolean(env.VITE_SITE_URL?.trim());
      siteConfig = createSiteConfig(isDevelopment ? { VITE_SITE_NAME: env.VITE_SITE_NAME } : env);
      if (mode !== 'development' && !siteConfig.url) {
        throw new Error('VITE_SITE_URL deve conter uma origem HTTPS válida para o build de produção.');
      }
    },
    configResolved(config) {
      root = config.root;
      outDir = resolve(root, config.build.outDir);
    },
    transformIndexHtml(html, context = {}) {
      const developmentOrigin = context.server?.resolvedUrls?.local?.[0] ||
        (context.server ? `http://localhost:${context.server.config.server.port || 5173}` : '');
      const configuredSiteUrl = siteConfig.url || (
        context.server ? createSiteConfig({}, developmentOrigin).url : ''
      );
      if (!configuredSiteUrl) {
        throw new Error('VITE_SITE_URL deve estar configurada para gerar canonical e Open Graph.');
      }

      const siteUrl = escapeHtml(configuredSiteUrl);
      return html
        .replaceAll('__SITE_NAME__', escapeHtml(siteConfig.name))
        .replaceAll('__SITE_URL__', siteUrl);
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = (request.url || '').split('?')[0];
        const metadata = publicMetadata[pathname];
        if (!metadata || !['GET', 'HEAD'].includes(request.method || 'GET')) return next();

        try {
          let requestSiteConfig = siteConfig;
          if (!hasConfiguredSiteUrl) {
            const protocol = request.headers['x-forwarded-proto'] || 'http';
            const host = request.headers.host || 'localhost:5173';
            requestSiteConfig = createSiteConfig({}, `${protocol}://${host}`);
          }
          const content = await renderPublicFile(metadata.fileName, requestSiteConfig);
          response.statusCode = 200;
          response.setHeader('Content-Type', metadata.contentType);
          response.end(request.method === 'HEAD' ? undefined : content);
        } catch (error) {
          next(error);
        }
      });
    },
    async writeBundle() {
      await Promise.all(
        Object.values(publicMetadata).map(async ({ fileName }) => {
          const content = await renderPublicFile(fileName);
          await writeFile(resolve(outDir, fileName), content);
        }),
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), siteConfigPlugin()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});