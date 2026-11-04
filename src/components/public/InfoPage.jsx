import React from 'react';
import { usePageMeta } from '@/lib/seo';

export function InfoSection({ heading, children }) {
  return (
    <section className="mt-8 space-y-3">
      {heading ? <h2 className="font-heading text-lg font-bold">{heading}</h2> : null}
      <div className="space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

export default function InfoPage({ title, description, path, updatedAt, children }) {
  usePageMeta({ title, description, path });
  return (
    <article className="mx-auto max-w-3xl">
      <header className="border-b border-border/70 pb-6">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">{title}</h1>
        {description ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        {updatedAt ? <p className="mt-3 text-[11px] text-muted-foreground">Atualizado em {updatedAt}</p> : null}
      </header>
      {children}
    </article>
  );
}
