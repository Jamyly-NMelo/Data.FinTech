import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Eye, EyeOff, LogOut, Menu, Moon, Plus, Settings, Sun } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { WorkspaceProvider, useWorkspace } from '@/lib/workspace';
import { usePreferences } from '@/lib/preferences';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { SITE_CONFIG } from '@/config/site';

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

const ENVIRONMENTS = [
  { value: 'pf', label: 'PF' },
  { value: 'pj', label: 'PJ' },
  { value: 'invest', label: 'INV' },
  { value: 'consolidado', label: 'CONS' },
];

const getInitials = (user) => {
  const fullName = String(user?.full_name || user?.name || '').trim();
  const emailName = String(user?.email || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
  const words = (fullName || emailName).split(/\s+/).filter(Boolean);
  if (!words.length) return 'U';
  if (words.length > 1) return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  return words[0].slice(0, 2).toUpperCase();
};

function WorkspaceShell() {
  const { user, logout } = useAuth();
  const { loading, error, refresh } = useWorkspace();
  const { toast } = useToast();
  const { environment, setEnvironment, privacy, togglePrivacy, theme, setTheme } = usePreferences();
  const [menuOpen, setMenuOpen] = useState(false);
  const isDark = theme === 'dark' || (
    theme === 'system' &&
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const handleLogout = async () => {
    try {
      await logout();
    } catch (logoutError) {
      toast({
        title: 'Não foi possível encerrar a sessão',
        description: logoutError.message,
        variant: 'destructive',
      });
    }
  };

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
      <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-7xl items-center gap-1 px-2 sm:gap-2 sm:px-4">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
              aria-label="Abrir menu de navegação"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <SheetContent side="left" className="flex flex-col gap-0">
              <SheetHeader className="border-b border-border/70 px-5 py-5">
                <SheetTitle className="flex items-center gap-2 font-heading text-primary">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-xs text-primary-foreground">DF</span>
                  {SITE_CONFIG.name}
                </SheetTitle>
                <SheetDescription className="sr-only">Navegação principal do aplicativo.</SheetDescription>
              </SheetHeader>
              <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegação principal">
                {LINKS.map(([to, label]) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <div className="inline-flex shrink-0 items-center rounded-full border border-border/70 bg-muted/50 p-0.5" role="group" aria-label="Ambiente financeiro">
            {ENVIRONMENTS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={environment === value}
                onClick={() => setEnvironment(value)}
                className={cn(
                  'rounded-full px-1.5 py-1 text-[10px] font-semibold leading-none transition-colors sm:px-2 sm:text-xs',
                  environment === value
                    ? 'bg-[#0F2C59] text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 w-8 border-primary/25 px-0 text-primary hover:bg-primary/5 sm:h-9 sm:w-auto sm:px-3"
              aria-label="Novo lançamento"
            >
              <Link to="/lancamentos?novo=1">
                <Plus className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Novo lançamento</span>
              </Link>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9"
              aria-label={privacy ? 'Mostrar valores' : 'Ocultar valores'}
              title={privacy ? 'Mostrar valores' : 'Ocultar valores'}
              onClick={togglePrivacy}
            >
              {privacy ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9"
              aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
              title={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 w-8 rounded-full p-0 sm:h-9 sm:w-9"
                  aria-label="Abrir menu do usuário"
                >
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                    {user?.picture_url ? <AvatarImage src={user.picture_url} alt="" referrerPolicy="no-referrer" /> : null}
                    <AvatarFallback className="bg-[#0F2C59] text-xs font-semibold text-white">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <span className="block truncate text-xs text-muted-foreground">{user?.email || 'E-mail não informado'}</span>
                  <span className="mt-1 block text-sm font-medium text-foreground">
                    {user?.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/configuracoes">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 pb-6 pt-24 sm:pb-8 sm:pt-28">
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
