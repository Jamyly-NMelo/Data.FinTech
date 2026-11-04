/** Registro do Service Worker — apenas em produção, para não interferir no preview. */
export const registerServiceWorker = () => {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* offline não é crítico: a aplicação continua funcionando online */
    });
  });
};