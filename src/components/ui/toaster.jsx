import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export function Toaster() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const add = (event) => {
      const message = event.detail;
      setMessages((current) => [...current, message]);
      window.setTimeout(() => {
        setMessages((current) => current.filter((item) => item.id !== message.id));
      }, 5000);
    };
    window.addEventListener('datafin:toast', add);
    return () => window.removeEventListener('datafin:toast', add);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
      {messages.map((message) => (
        <div
          key={message.id}
          role={message.variant === 'destructive' ? 'alert' : 'status'}
          className={`rounded-xl border bg-card p-4 text-sm shadow-lg ${message.variant === 'destructive' ? 'border-destructive/40' : 'border-border'}`}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {message.title ? <p className="font-semibold">{message.title}</p> : null}
              {message.description ? <p className="mt-1 text-muted-foreground">{message.description}</p> : null}
            </div>
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="Fechar notificação"
              onClick={() => setMessages((current) => current.filter((item) => item.id !== message.id))}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
