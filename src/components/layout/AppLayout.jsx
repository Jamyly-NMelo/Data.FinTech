import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { WorkspaceProvider, useWorkspace } from '@/lib/workspace';
import { cn } from '@/lib/utils';

const LINKS = [
  ['/','Painel'],
  ['/consolidado','Consolidado'],
  ['/lancamentos','Lançamentos'],
  ['/contas','Contas'],
  ['/orcamento','Orçamento'],
  ['/metas','Metas'],
  ['/dividas','Dívidas'],
  ['/investimentos','Investimentos'],
  ['/dre','DRE'],
  ['/precificacao','Precificação'],
  ['/simulador-tributario','Tributos'],
  ['/backup','Backup'],
  ['/configuracoes','Configurações'],
];

function WorkspaceShell() {
  const { user, logout } = useAuth();
  const { loading, error, refresh } = useWorkspace();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" role="status" aria-label="Carregando seus dados">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <section className="rounded-2xl border border-destructive/40 bg-card p-6" role="alert">
          <h1 className="font-heading text-lg font-semibold">Não foi possível carregar seus dados</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <button type="button" className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={refresh}>
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="mr-auto inline-flex items-center gap-2 font-heading font-bold text-primary">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-xs text-primary-foreground">DF</span>
            Data Fintech
          </Link>
          <span className="hidden text-xs text-muted-foreground sm:inline">{user?.email}</span>
          <button type="button" className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted" onClick={() => logout()}>
            Sair
          </button>
          <nav className="no-scrollbar order-3 flex w-full gap-1 overflow-x-auto border-t border-border/50 pt-2" aria-label="Navegação principal">
            {LINKS.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn('whitespace-nowrap rounded-lg px-3 py-2 text-xs transition-colors', isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default function AppLayout() {
  return (
    <WorkspaceProvider>
      <WorkspaceShell />
    </WorkspaceProvider>
  );
}
