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
import ProgressBar from '@/components/common/ProgressBar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useWorkspace } from '@/lib/workspace';
import { usePreferences } from '@/lib/preferences';
import { ENVIRONMENTS } from '@/lib/finance/metrics';
import { daysBetween, monthKey } from '@/lib/finance/periods';
import { formatDate, formatPercent, todayISO } from '@/lib/format';
import { Flag, MoreHorizontal, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react';

const PRIORITIES = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
];

const STATUS_OPTIONS = [
  { value: 'ativa', label: 'Ativa' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'pausada', label: 'Pausada' },
];

const ENV_OPTIONS = ENVIRONMENTS.filter((item) => item.value !== 'consolidado').map((item) => ({
  value: item.value,
  label: item.label,
}));

export default function Goals() {
  const { goals, create, update, remove } = useWorkspace();
  const { environment } = usePreferences();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [contributing, setContributing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const scope = useMemo(
    () => goals.filter((goal) => environment === 'consolidado' || goal.environment === environment),
    [goals, environment],
  );

  const totals = useMemo(() => {
    const target = scope.reduce((sum, goal) => sum + Number(goal.target_amount || 0), 0);
    const saved = scope.reduce((sum, goal) => sum + Number(goal.saved_amount || 0), 0);
    const active = scope.filter((goal) => goal.status === 'ativa').length;
    const monthlyNeeded = scope
      .filter((goal) => goal.status === 'ativa' && goal.deadline)
      .reduce((sum, goal) => {
        const remaining = Math.max(0, Number(goal.target_amount || 0) - Number(goal.saved_amount || 0));
        const days = daysBetween(todayISO(), goal.deadline);
        if (days <= 0) return sum;
        return sum + (remaining / (days / 30));
      }, 0);
    return { target, saved, active, monthlyNeeded, progress: target > 0 ? (saved / target) * 100 : 0 };
  }, [scope]);

  const handleSubmit = async (values) => {
    if (editing) await update('Goal', editing.id, values);
    else await create('Goal', values);
  };

  const handleContribution = async (values) => {
    const added = Number(values.amount) || 0;
    await update('Goal', contributing.id, { saved_amount: Number(contributing.saved_amount || 0) + added });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas e reserva"
        description="Acompanhe objetivos e a reserva de emergência. O progresso vem dos aportes registrados, nunca de valores fixos."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova meta
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Objetivo total" value={<Money value={totals.target} />} icon={Flag} tone="navy" hint={`${totals.active} meta(s) ativa(s)`} />
        <StatCard
          label="Já reservado"
          value={<Money value={totals.saved} />}
          hint={`${formatPercent(totals.progress, 1)} do total planejado.`}
          tone="mint"
        />
        <StatCard
          label="Aporte mensal necessário"
          value={<Money value={totals.monthlyNeeded} />}
          icon={TrendingUp}
          tone="amber"
          hint="Estimativa para cumprir os prazos das metas ativas."
        />
      </div>

      {scope.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="Nenhuma meta cadastrada"
          description="Crie metas como reserva de emergência, viagem ou investimento e acompanhe o quanto já foi reservado."
          action={
            <Button
              size="sm"
              className="mt-1"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Criar primeira meta
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {scope.map((goal) => {
            const target = Number(goal.target_amount || 0);
            const saved = Number(goal.saved_amount || 0);
            const progress = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
            const remaining = Math.max(0, target - saved);
            const days = goal.deadline ? daysBetween(todayISO(), goal.deadline) : null;

            return (
              <SectionCard
                key={goal.id}
                title={goal.name}
                description={
                  goal.deadline
                    ? days !== null && days >= 0
                      ? `Prazo em ${formatDate(goal.deadline)} · faltam ${days} dia(s)`
                      : `Prazo ${formatDate(goal.deadline)} já alcançado`
                    : 'Sem prazo definido'
                }
                action={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Ações da meta">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="cursor-pointer" onClick={() => setContributing(goal)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Registrar aporte
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => {
                          setEditing(goal);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => update('Goal', goal.id, { status: goal.status === 'concluida' ? 'ativa' : 'concluida' })}
                      >
                        {goal.status === 'concluida' ? 'Reabrir meta' : 'Marcar como concluída'}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setRemoving(goal)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={goal.status === 'concluida' ? 'secondary' : goal.status === 'pausada' ? 'outline' : 'default'} className="text-[10px]">
                      {STATUS_OPTIONS.find((item) => item.value === goal.status)?.label || 'Ativa'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      prioridade {PRIORITIES.find((item) => item.value === goal.priority)?.label || 'Média'}
                    </Badge>
                  </div>
                  <ProgressBar value={progress} barClassName="bg-success" />
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-semibold">
                      <Money value={saved} />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      de <Money value={target} />
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {remaining > 0 ? (
                      <>
                        Faltam <Money value={remaining} /> ({formatPercent(progress, 1)} concluído).
                      </>
                    ) : (
                      'Meta atingida — parabéns!'
                    )}
                  </p>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => setContributing(goal)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Registrar aporte
                  </Button>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Editar meta' : 'Nova meta'}
        columns={2}
        initialValues={editing || { name: '', target_amount: '', saved_amount: '0', deadline: '', priority: 'media', status: 'ativa', environment: environment === 'consolidado' ? 'pf' : environment, notes: '' }}
        fields={[
          { name: 'name', label: 'Nome da meta', type: 'text', required: true, placeholder: 'Ex.: Reserva de emergência', colSpan: 2 },
          { name: 'target_amount', label: 'Valor objetivo', type: 'currency', required: true, placeholder: '0,00' },
          { name: 'saved_amount', label: 'Valor já reservado', type: 'currency', placeholder: '0,00' },
          { name: 'deadline', label: 'Prazo', type: 'date' },
          { name: 'priority', label: 'Prioridade', type: 'select', options: PRIORITIES },
          { name: 'status', label: 'Situação', type: 'select', options: STATUS_OPTIONS },
          { name: 'environment', label: 'Ambiente', type: 'select', options: ENV_OPTIONS, required: true },
          { name: 'notes', label: 'Observações', type: 'textarea', colSpan: 2 },
        ]}
        onSubmit={handleSubmit}
      />

      <FormDialog
        open={Boolean(contributing)}
        onOpenChange={(open) => !open && setContributing(null)}
        title="Registrar aporte"
        description={contributing ? `Novo valor para "${contributing.name}".` : ''}
        initialValues={{ amount: '' }}
        fields={[{ name: 'amount', label: 'Valor do aporte', type: 'currency', required: true, placeholder: '0,00' }]}
        submitLabel="Registrar aporte"
        onSubmit={handleContribution}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Excluir meta"
        description={removing ? `"${removing.name}" e o histórico de aportes dessa meta serão removidos.` : ''}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => remove('Goal', removing.id)}
      />
    </div>
  );
}