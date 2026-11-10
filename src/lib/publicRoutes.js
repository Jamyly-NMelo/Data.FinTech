/** Rotas públicas (visitante sem conta). Nenhuma delas lê dados do usuário. */
export const PUBLIC_PATHS = ['/artigos', '/sobre', '/contato', '/privacidade', '/termos', '/oauth/consent'];

export function isPublicPath(pathname) {
  const path = (pathname || '').replace(/\/+$/, '') || '/';
  return PUBLIC_PATHS.some((item) => path === item || path.startsWith(`${item}/`));
}