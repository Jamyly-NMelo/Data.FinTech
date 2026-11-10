import React, { useEffect, useRef, useState } from 'react';
import { post } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_URL = 'https://accounts.google.com/gsi/client?hl=pt-BR';

const loadGoogleIdentity = () => {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (window.dataFinGsiPromise) return window.dataFinGsiPromise;

  window.dataFinGsiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => window.google?.accounts?.id
      ? resolve(window.google)
      : reject(new Error('O Google Identity Services não iniciou corretamente.'));
    script.onerror = () => reject(new Error('Não foi possível carregar o login do Google.'));
    document.head.appendChild(script);
  });
  return window.dataFinGsiPromise;
};

export default function GoogleSignInButton({ returnTo = '/', onError, oneTap = true }) {
  const buttonRef = useRef(null);
  const callbacksRef = useRef({ onError });
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState('');
  callbacksRef.current = { onError };

  useEffect(() => {
    if (!CLIENT_ID) {
      setUnavailable('Login com Google ainda não foi configurado.');
      return undefined;
    }

    let active = true;
    loadGoogleIdentity()
      .then((google) => {
        if (!active || !buttonRef.current) return;
        const container = buttonRef.current;
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          auto_select: false,
          use_fedcm_for_prompt: true,
          callback: async ({ credential }) => {
            if (!credential) {
              callbacksRef.current.onError?.('O Google não retornou uma credencial.');
              return;
            }
            setLoading(true);
            try {
              await post('auth.googleLogin', { credential });
              window.location.assign(returnTo);
            } catch (error) {
              callbacksRef.current.onError?.(error.message || 'Não foi possível entrar com Google.');
            } finally {
              setLoading(false);
            }
          },
        });
        google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.min(360, Math.max(240, Math.floor(container.getBoundingClientRect().width))),
        });
        if (oneTap) {
          google.accounts.id.prompt((notification) => {
            if (!active || notification.isNotDisplayed() || notification.isSkippedMoment()) return;
          });
        }
      })
      .catch((error) => {
        if (!active) return;
        setUnavailable(error.message || 'Login com Google indisponível.');
        callbacksRef.current.onError?.(error.message || 'Login com Google indisponível.');
      });

    return () => {
      active = false;
      if (buttonRef.current) buttonRef.current.replaceChildren();
    };
  }, [oneTap, returnTo]);

  if (!CLIENT_ID || unavailable) {
    return (
      <p className="text-center text-xs text-muted-foreground" role="status">
        {unavailable || 'Login com Google ainda não foi configurado.'}
      </p>
    );
  }

  return (
    <div className="relative min-h-10">
      <div ref={buttonRef} className="flex justify-center" />
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80" role="status" aria-label="Validando conta Google">
          <Button type="button" variant="outline" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Validando conta…
          </Button>
        </div>
      ) : null}
    </div>
  );
}
