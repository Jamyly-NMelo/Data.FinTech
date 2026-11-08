import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import SectionCard from '@/components/common/SectionCard';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import FormDialog from '@/components/common/FormDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useWorkspace } from '@/lib/workspace';
import { usePreferences } from '@/lib/preferences';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import DefaultCategoriesDialog from '@/components/settings/DefaultCategoriesDialog';
import { ENVIRONMENTS } from '@/lib/finance/metrics';
import { SITE_CONFIG } from '@/config/site';
import { ListPlus, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';

const KIND_OPTIONS = [
  { value: 'expense', label: 'Despesa' },
  { value: 'income', label: 'Receita' },
];

const GROUP_OPTIONS = [
  { value: 'receita', label: 'Receita' },
  { value: 'custos', label: 'Custos variáveis' },
  { value: 'operacional', label: 'Despesas operacionais' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'prolabore', label: 'Pró-labore' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'impostos', label: 'Impostos' },
  { value: 'patrimonio', label: 'Patrimonial' },
];

const ENV_OPTIONS = ENVIRONMENTS.filter((item) => item.value !== 'consolidado').map((item) => ({
  value: item.value,
  label: item.label,
}));

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Seguir o sistema' },
];

export default function Settings() {
  const { user } = useAuth();
  const initials = String(user?.full_name || user?.email?.split('@')[0] || 'U')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const { preferences, update, privacy, togglePrivacy, theme, setTheme, environment, setEnvironment } = usePreferences();
  const { categories, create, createMany, update: updateRecord, remove } = useWorkspace();
  const { toast } = useToast();

  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [agendaDays, setAgendaDays] = useState(String(preferences.agenda_days || 10));
  const [projectionMonths, setProjectionMonths] = useState(String(preferences.projection_months || 12));

  const grouped = useMemo(() => {
    return ENVIRONMENTS.filter((item) => item.value !== 'consolidado').map((item) => ({
      ...item,
      categories: categories.filter((category) => category.environment === item.value),
    }));
  }, [categories]);

  const handleSubmit = async (values) => {
    if (editing) await updateRecord('Category', editing.id, values);
    else await create('Category', values);
  };

  const handleCreateDefaults = async (items) => {
    await createMany('Category', items);
    toast({
      title: `${items.length} categoria(s) padrão adicionada(s)`,
      description: 'Categorias já existentes não foram duplicadas nem alteradas.',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Aparência, privacidade, preferências de acompanhamento e classificação das categorias usadas no DRE e no orçamento."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Aparência e privacidade" description="O modo privacidade oculta os valores em toda a interface, inclusive nos gráficos.">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tema</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Modo privacidade</p>
                <p className="text-[11px] text-muted-foreground">Oculta valores de saldos, indicadores e gráficos.</p>
              </div>
              <Switch checked={privacy} onCheckedChange={togglePrivacy} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ambiente padrão</Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENVIRONMENTS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Acompanhamento" description="Define quantos dias aparecem na agenda e quantos meses na projeção de saldo.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Dias na agenda</Label>
              <Input
                value={agendaDays}
                onChange={(event) => setAgendaDays(event.target.value)}
                inputMode="numeric"
                className="h-9 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => update({ agenda_days: Number(agendaDays) || 10 })}
                disabled={Number(agendaDays) === Number(preferences.agenda_days || 10)}
              >
                Salvar
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Meses na projeção</Label>
              <Input
                value={projectionMonths}
                onChange={(event) => setProjectionMonths(event.target.value)}
                inputMode="numeric"
                className="h-9 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => update({ projection_months: Number(projectionMonths) || 12 })}
                disabled={Number(projectionMonths) === Number(preferences.projection_months || 12)}
              >
                Salvar
              </Button>
            </div>
          </div>

        </SectionCard>
      </div>

      <SectionCard title="Perfil e segurança" description="Dados vinculados à sua conta autenticada e opções de segurança.">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar className="h-14 w-14">
            {user?.picture_url ? <AvatarImage src={user.picture_url} alt="" referrerPolicy="no-referrer" /> : null}
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{user?.full_name || 'Sua conta'}</p>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            <p className="mt-1 break-all text-[10px] text-muted-foreground">ID interno: {user?.id || '—'}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Criada em: {user?.created_date ? new Date(user.created_date).toLocaleDateString('pt-BR') : '—'}</p>
            <Badge variant="outline" className="mt-2 text-[10px]">
              {user?.role === 'admin' ? 'Administrador' : 'Usuário'}
            </Badge>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/forgot-password">Redefinir senha por e-mail</Link>
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Categorias"
        description="O grupo define como a categoria entra no DRE e no orçamento. Categorias removidas aparecem como “Categoria removida” nos lançamentos antigos."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setDefaultsOpen(true)}>
              <ListPlus className="mr-2 h-4 w-4" />
              Categorias padrão
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova categoria
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {grouped.map((group) =>
            group.categories.length ? (
              <div key={group.value}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
                <ul className="divide-y divide-border/60">
                  {group.categories.map((category) => (
                    <li key={category.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm">{category.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {category.kind === 'income' ? 'Receita' : 'Despesa'}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {GROUP_OPTIONS.find((item) => item.value === category.group)?.label || 'Não classificado'}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Ações da categoria">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setEditing(category);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setRemoving(category)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma categoria cadastrada. Crie categorias para classificar lançamentos, orçamentos e o DRE.
            </p>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Sobre o produto" description={`${SITE_CONFIG.name} transforma dados financeiros em indicadores claros.`}>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-navy font-heading text-xs font-bold text-white dark:bg-primary dark:text-primary-foreground">
            DF
          </span>
          <div>
            <p className="font-medium text-foreground">{SITE_CONFIG.name}</p>
            <p>“Finanças simples para quem quer focar no que importa.”</p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            formato de backup v1
          </Badge>
        </div>
      </SectionCard>

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Editar categoria' : 'Nova categoria'}
        columns={2}
        initialValues={editing || { name: '', kind: 'expense', group: 'operacional', environment: environment === 'consolidado' ? 'pf' : environment }}
        fields={[
          { name: 'name', label: 'Nome', type: 'text', required: true, placeholder: 'Ex.: Mercado', colSpan: 2 },
          { name: 'kind', label: 'Tipo', type: 'select', options: KIND_OPTIONS, required: true },
          { name: 'group', label: 'Grupo no DRE', type: 'select', options: GROUP_OPTIONS, required: true },
          { name: 'environment', label: 'Ambiente', type: 'select', options: ENV_OPTIONS, required: true },
        ]}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Excluir categoria"
        description={removing ? `"${removing.name}" deixará de classificar novos lançamentos. Os lançamentos existentes continuarão salvos.` : ''}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => remove('Category', removing.id)}
      />

      <DefaultCategoriesDialog
        open={defaultsOpen}
        onOpenChange={setDefaultsOpen}
        categories={categories}
        initialEnvironment={environment === 'consolidado' ? 'pf' : environment}
        onCreate={handleCreateDefaults}
      />
    </div>
  );
}