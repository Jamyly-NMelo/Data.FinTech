import React, { useMemo, useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import FormDialog from '@/components/common/FormDialog';
import StatCard from '@/components/common/StatCard';
import Money from '@/components/common/Money';
import SectionCard from '@/components/common/SectionCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import ProgressBar from '@/components/common/ProgressBar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useWorkspace } from '@/lib/workspace';
import { usePreferences } from '@/lib/preferences';
import { budgetOverview, buildBudgets } from '@/lib/finance/budget';
import { ENVIRONMENTS } from '@/lib/finance/metrics';
import { monthKey } from '@/lib/finance/periods';
import { formatPercent } from '@/lib/format';
import { MoreHorizontal, Pencil, PiggyBank, Plus, Trash2 } from 'lucide-react';

const statusMeta = {
  ok: { label: 'Dentro do previsto', variant: 'secondary' },
  atencao: { label: 'Atenção', variant: 'default' },
  estourado: { label: 'Estourado', variant: 'destructive' },
  'sem-limite': { label: 'Sem limite definido', variant: 'outline' },
};

export default function Budgets() {
  const { budgets, categories, transactions, create, update, remove } = useWorkspace();
  const { environment } = usePreferences();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const scope = environment === 'consolidado' ? 'pf' : environment;

  const rows = useMemo(
    () => buildBudgets({ budgets, transactions, categories, month, environment }),
    [budgets, transactions, categories, month, environment],
  );
  const overview = useMemo(() => budgetOverview(rows), [rows]);

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.kind === 'expense'),
    [categories],
  );

  const handleSubmit = async (values) => {
    const payload = { ...values, month };
    if (editing) await update('Budget', editing.id, payload);
    else await create('Budget', payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamento por categoria"
        description="Previsto x realizado do mês, considerando apenas despesas liquidadas. Percentuais de alerta são configuráveis por categoria."
        actions={
          <div className="flex items-center gap-2">
            <Input type="month" value={month} onChange={(event) => setMonth(event.target.value || monthKey(new Date()))} className="h-9 w-[9.5rem] text-xs" aria-label="Mês do orçamento" />
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo orçamento
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Planejado no mês" value={<Money value={overview.planned} />} icon={PiggyBank} tone="navy" />
        <StatCard
          label="Realizado"
          value={<Money value={overview.spent} />}
          hint={`${formatPercent(overview.usedPercent, 1)} do planejado.`}
          tone={overview.overCount > 0 ? 'danger' : 'mint'}
        />
        <StatCard
          label="Disponível"
          value={<Money value={overview.remaining} />}
          hint={`${overview.overCount} categoria(s) estourada(s) · ${overview.warningCount} em atenção.`}
          tone={overview.remaining < 0 ? 'danger' : 'mint'}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Nenhum orçamento definido para este mês"
          description="Defina limites por categoria para acompanhar quanto do planejado já foi consumido."
          action={
            <Button
              size="sm"
              className="mt-1"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Criar orçamento
            </Button>
          }
        />
      ) : (
        <SectionCard title="Acompanhamento por categoria" description="Ordenado pelo percentual consumido.">
          <ul className="space-y-4">
            {rows.map((row) => {
              const meta = statusMeta[row.status] || statusMeta.ok;
              return (
                <li key={row.budget.id} className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{row.category_name}</span>
                      <Badge variant={meta.variant} className="text-[10px]">
                        {meta.label}
                      </Badge>
                      {row.category_missing ? (
                        <Badge variant="outline" className="text-[10px]">
                          categoria removida
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular text-xs text-muted-foreground">
                        <Money value={row.spent} /> / <Money value={row.amount} />
                      </span>
                      <span className="tabular w-14 text-right text-xs font-semibold">{formatPercent(row.usedPercent, 1)}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Ações do orçamento">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setEditing(row.budget);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => update('Budget', row.budget.id, { month })}>
                            Copiar para o mês exibido
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setRemoving(row.budget)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <ProgressBar
                    value={row.usedPercent}
                    barClassName={row.status === 'estourado' ? 'bg-destructive' : row.status === 'atencao' ? 'bg-warning' : 'bg-success'}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {row.remaining >= 0 ? (
                      <>
                        Restam <Money value={row.remaining} /> neste mês.
                      </>
                    ) : (
                      <>
                        Excedeu em <Money value={Math.abs(row.remaining)} />.
                      </>
                    )}
                    {row.alert_percent ? ` Alerta definido em ${formatPercent(row.alert_percent, 0)}.` : ''}
                  </p>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Editar orçamento' : 'Novo orçamento'}
        description="O orçamento vale para o mês selecionado no topo da tela."
        columns={2}
        initialValues={editing || { category_id: '', amount: '', alert_percent: '80', notes: '', environment: scope, month }}
        fields={[
          {
            name: 'category_id',
            label: 'Categoria',
            type: 'select',
            required: true,
            options: expenseCategories.map((category) => ({ value: category.id, label: category.name })),
            help: expenseCategories.length === 0 ? 'Cadastre categorias de despesa em Configurações > Categorias.' : undefined,
          },
          { name: 'amount', label: 'Valor planejado', type: 'currency', required: true, placeholder: '0,00' },
          { name: 'environment', label: 'Ambiente', type: 'select', required: true, options: ENVIRONMENTS.filter((item) => item.value !== 'consolidado').map((item) => ({ value: item.value, label: item.label })) },
          { name: 'month', label: 'Mês (AAAA-MM)', type: 'text', required: true, placeholder: '2026-10' },
          { name: 'alert_percent', label: 'Alertar ao atingir (%)', type: 'percent', placeholder: '80' },
          { name: 'notes', label: 'Observações', type: 'textarea', colSpan: 2 },
        ]}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Excluir orçamento"
        description="O limite desta categoria será removido para o mês selecionado."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => remove('Budget', removing.id)}
      />
    </div>
  );
}