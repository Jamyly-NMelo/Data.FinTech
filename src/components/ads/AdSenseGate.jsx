import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isAdEligiblePath, loadAdSenseScript } from '@/lib/finance/adsense';

/**
 * Carrega o script do Google AdSense apenas quando a rota atual é uma página
 * editorial publicada. Em qualquer outra tela nada é carregado.
 * Deve ser montado somente dentro de páginas de artigo.
 */
export default function AdSenseGate() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isAdEligiblePath(pathname)) return;
    loadAdSenseScript();
  }, [pathname]);

  return null;
}