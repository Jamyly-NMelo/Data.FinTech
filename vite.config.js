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

  const renderPublicFile = async (fileName) => {
    const template = await readFile(resolve(root, 'public', fileName), 'utf8');
    const encodedName = JSON.stringify(siteConfig.name).slice(1, -1);
    return template
      .replaceAll('__SITE_URL__', siteConfig.url)
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
      siteConfig = createSiteConfig(loadEnv(mode, root, 'VITE_'));
    },
    configResolved(config) {
      root = config.root;
      outDir = resolve(root, config.build.outDir);
    },
    transformIndexHtml(html) {
      return html.replaceAll('__SITE_NAME__', escapeHtml(siteConfig.name));
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = (request.url || '').split('?')[0];
        const metadata = publicMetadata[pathname];
        if (!metadata || !['GET', 'HEAD'].includes(request.method || 'GET')) return next();

        try {
          const content = await renderPublicFile(metadata.fileName);
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

export default defineConfig({
  plugins: [react(), siteConfigPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});