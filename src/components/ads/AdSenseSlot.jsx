import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ADSENSE_CLIENT_ID, ADSENSE_SLOT, isAdEligiblePath, loadAdSenseScript } from '@/lib/finance/adsense';

/**
 * Bloco de anúncio individual. Só renderiza em artigo publicado e apenas quando
 * existir um identificador de bloco real em ADSENSE_SLOT (hoje nulo, para não
 * inventar identificadores). Sem essas condições não gera nenhum espaço vazio.
 */
export default function AdSenseSlot({ slot = ADSENSE_SLOT, className }) {
  const { pathname } = useLocation();
  const eligible = Boolean(slot) && isAdEligiblePath(pathname);

  useEffect(() => {
    if (!eligible) return;
    let cancelled = false;
    loadAdSenseScript().then((ready) => {
      if (!ready || cancelled) return;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        /* o bloco simplesmente não é preenchido; nenhum layout é afetado */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [eligible, slot]);

  if (!eligible) return null;

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}