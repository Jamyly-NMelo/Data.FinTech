import { useCallback } from 'react';

export function toast(message) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('datafin:toast', { detail: { ...message, id: crypto.randomUUID() } }));
}

export function useToast() {
  return { toast: useCallback((message) => toast(message), []) };
}
