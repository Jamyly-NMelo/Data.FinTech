import React from 'react';
import { Link, Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-5 px-4 py-4">
          <Link to="/" className="mr-auto font-heading font-bold text-primary">Data Fintech</Link>
          <nav className="flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="Navegação pública">
            <Link to="/artigos" className="hover:text-primary">Artigos</Link>
            <Link to="/sobre" className="hover:text-primary">Sobre</Link>
            <Link to="/contato" className="hover:text-primary">Contato</Link>
          </nav>
          <Link to="/login" className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">Entrar</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <Outlet />
      </main>
      <footer className="border-t border-border/70">
        <nav className="mx-auto flex max-w-3xl flex-wrap gap-4 px-4 py-6 text-xs text-muted-foreground">
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/termos">Termos</Link>
          <Link to="/contato">Contato</Link>
        </nav>
      </footer>
    </div>
  );
}
