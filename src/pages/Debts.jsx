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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useWorkspace } from '@/lib/workspace';
import { usePreferences } from '@/lib/preferences';
import { ENVIRONMENTS, averageMonthlyIncome, filterTransactions } from '@/lib/finance/metrics';
import { debtProjection, debtTotals, incomeCommitment } from '@/lib/finance/debt';
import { DEBT_TERMS } from '@/lib/finance/liabilities';
import LiabilityBreakdown from '@/components/debts/LiabilityBreakdown';
import { formatPercent } from '@/lib/format';
import { AlertTriangle, CreditCard, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';

const ENV_OPTIONS = ENVIRONMENTS.filter((item) => item.value !== 'consolidado').map((item) => ({
  value: item.value,
  label: item.label,
}));

export default function Debts() {
  const { debts, transactions, create, update, remove } = useWorkspace();
  const { environment } = usePreferences();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const scope = useMemo(
    () => debts.filter((debt) => environment === 'consolidado' || debt.environment === environment),
    [debts, environment],
  );

  const totals = useMemo(() => debtTotals(scope), [scope]);
  const projections = useMemo(() => debtProjection(scope), [scope]);

  const monthlyIncome = useMemo(() => {
    const scopedTransactions = filterTransactions(transactions, { environment });
    return averageMonthlyIncome(scopedTransactions, 3);
  }, [transactions, environment]);

  const commitment = incomeCommitment(totals.installments, monthlyIncome);
  const totalInterest = useMemo(
    () => projections.reduce((sum, item) => sum + (item.simulation.totalInterest || 0), 0),
    [projections],
  );

  const handleSubmit = async (values) => {
    if (editing) await update('Debt', editing.id, values);
    else await create('Debt', values);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de dívidas"
        description="Saldo devedor, custo do crédito e prazo estimado de quitação. As parcelas futuras aparecem como pendência nos lançamentos."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova dívida
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Saldo devedor total" value={<Money value={totals.outstanding} />} icon={CreditCard} tone={totals.outstanding > 0 ? 'danger' : 'mint'} hint={`${totals.count} dívida(s) no ambiente.`} />
        <StatCard label="Parcelas mensais" value={<Money value={totals.installments} />} tone="navy" hint={`Taxa média ponderada de ${formatPercent(totals.avgRate, 2)} ao ano.`} />
        <StatCard
          label="Comprometimento da renda"
          value={commitment === null ? '—' : formatPercent(commitment, 1)}
          tone={commitment !== null && commitment > 30 ? 'danger' : 'amber'}
          hint={
            monthlyIncome > 0
              ? `Base: receita média de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyIncome)} nos últimos 3 meses.`
              : 'Sem receita liquidada nos últimos 3 meses para comparar.'
          }
        />
        <StatCard
          label="Juros projetados"
          value={<Money value={totalInterest} />}
          tone="amber"
          hint="Estimativa mantendo a parcela atual até a quitação."
        />
      </div>

      <LiabilityBreakdown debts={scope} />

      {scope.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhuma dívida cadastrada"
          description="Cadastre financiamentos, empréstimos ou parcelamentos para acompanhar saldo, juros e prazo de quitação."
          action={
            <Button
              size="sm"
              className="mt-1"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Cadastrar dívida
            </Button>
          }
        />
      ) : (
        <SectionCard title="Dívidas no ambiente" description="Simulação de quitação com a parcela e a taxa informadas.">
          <ul className="divide-y divide-border/60">
            {projections.map(({ debt, simulation }) => (
              <li key={debt.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{debt.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {debt.creditor || 'Credor não informado'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Principal {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(debt.principal || 0))} · taxa{' '}
                    {formatPercent(Number(debt.annual_interest_rate || 0), 2)} ao ano · parcela{' '}
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(debt.installment_amount || 0))}
                    {Number(debt.installments_total) > 0
                      ? ` · ${Number(debt.installments_paid || 0)}/${Number(debt.installments_total)} parcelas`
                      : ''}
                  </p>
                  {simulation.impossible ? (
                    <p className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {simulation.reason}
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {simulation.months === 0
                        ? 'Dívida já quitada.'
                        : `Quitação em ${simulation.months} mês(es) · juros estimados de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(simulation.totalInterest)} · total pago ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(simulation.totalPaid)}.`}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  <div className="text-right">
                    <Money value={debt.outstanding_balance} colored className="text-sm font-semibold" />
                    <p className="text-[11px] text-muted-foreground">saldo devedor</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Ações da dívida">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => {
                          setEditing(debt);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() =>
                          update('Debt', debt.id, {
                            installments_paid: Number(debt.installments_paid || 0) + 1,
                          })
                        }
                      >
                        Registrar parcela paga
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setRemoving(debt)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Editar dívida' : 'Nova dívida'}
        description="A simulação usa juros compostos mensais sobre o saldo devedor."
        columns={2}
        initialValues={editing || { name: '', creditor: '', principal: '', outstanding_balance: '', annual_interest_rate: '', future_interest: '', installment_amount: '', installments_total: '', installments_paid: '0', start_date: '', maturity_date: '', term: 'nao_classificado', due_day: '', environment: environment === 'consolidado' ? 'pf' : environment, notes: '' }}
        fields={[
          { name: 'name', label: 'Nome da dívida', type: 'text', required: true, placeholder: 'Ex.: Financiamento do carro' },
          { name: 'creditor', label: 'Credor', type: 'text', placeholder: 'Ex.: Banco' },
          { name: 'principal', label: 'Valor original', type: 'currency', placeholder: '0,00' },
          { name: 'outstanding_balance', label: 'Saldo devedor atual', type: 'currency', required: true, placeholder: '0,00' },
          { name: 'annual_interest_rate', label: 'Juros ao ano (%)', type: 'percent', placeholder: '0' },
          { name: 'future_interest', label: 'Juros futuros contratados', type: 'currency', placeholder: '0,00' },
          { name: 'installment_amount', label: 'Valor da parcela', type: 'currency', placeholder: '0,00' },
          { name: 'installments_total', label: 'Total de parcelas', type: 'number', placeholder: '0' },
          { name: 'installments_paid', label: 'Parcelas pagas', type: 'number', placeholder: '0' },
          { name: 'maturity_date', label: 'Vencimento final', type: 'date' },
          {
            name: 'term',
            label: 'Classificação no passivo',
            type: 'select',
            options: DEBT_TERMS,
            help: 'Sem classificação, o vencimento decide entre curto e longo prazo.',
          },
          { name: 'start_date', label: 'Início', type: 'date' },
          { name: 'due_day', label: 'Dia de vencimento', type: 'number', placeholder: '10' },
          { name: 'environment', label: 'Ambiente', type: 'select', options: ENV_OPTIONS, required: true },
          { name: 'notes', label: 'Observações', type: 'textarea', colSpan: 2 },
        ]}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Excluir dívida"
        description={removing ? `"${removing.name}" sairá do acompanhamento de passivos.` : ''}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => remove('Debt', removing.id)}
      />
    </div>
  );
}