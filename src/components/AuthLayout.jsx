import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '@/config/site';

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 font-heading text-sm font-bold text-primary">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">DF</span>
          {SITE_CONFIG.name}
        </Link>
        <div className="mb-6">
          {Icon ? (
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-primary">
              <Icon className="h-5 w-5" />
            </span>
          ) : null}
          <h1 className="font-heading text-2xl font-bold">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
        {footer ? <div className="mt-6 border-t border-border/70 pt-5 text-center text-sm text-muted-foreground">{footer}</div> : null}
      </section>
    </main>
  );
}
