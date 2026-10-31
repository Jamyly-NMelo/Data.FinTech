import React, { useMemo, useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import FormDialog from '@/components/common/FormDialog';
import Money from '@/components/common/Money';
import SectionCard from '@/components/common/SectionCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkspace } from '@/lib/workspace';
import { ACTIVITIES, ANNEXES, REGIMES, TAX_DISCLAIMER, compareRegimes } from '@/lib/finance/tax';
import { formatPercent } from '@/lib/format';
import { AlertTriangle, Landmark, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';

const FIELDS = [
  { name: 'name', label: 'Nome do cenário', type: 'text', required: true, placeholder: 'Ex.: Cenário atual', colSpan: 2 },
  { name: 'activity', label: 'Atividade', type: 'select', options: ACTIVITIES, required: true },
  { name: 'service_annex', label: 'Anexo do Simples (serviços)', type: 'select', options: ANNEXES },
  { name: 'monthly_revenue', label: 'Faturamento mensal', type: 'currency', required: true, placeholder: '0,00' },
  { name: 'annual_revenue', label: 'Faturamento dos últimos 12 meses (RBT12)', type: 'currency', placeholder: '0,00', help: 'Usado para a alíquota efetiva do Simples Nacional.' },
  { name: 'profit_margin_percent', label: 'Margem de lucro estimada (%)', type: 'percent', placeholder: '20', help: 'Premissa do Lucro Real.' },
  { name: 'iss_percent', label: 'ISS (%)', type: 'percent', placeholder: '5' },
  { name: 'mei_das', label: 'DAS-MEI mensal', type: 'currency', placeholder: '0,00' },
  { name: 'notes', label: 'Observações sobre a decisão', type: 'textarea', colSpan: 2 },
];

export default function TaxSimulator() {
  const { scenarios, create, update, remove } = useWorkspace();
  const [selectedId, setSelectedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const selected = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedId) || scenarios[0] || null,
    [scenarios, selectedId],
  );

  const comparison = useMemo(() => (selected ? compareRegimes(selected) : null), [selected]);

  const handleSubmit = async (values) => {
    const payload = { ...values };
    if (editing) await update('TaxScenario', editing.id, payload);
    else await create('TaxScenario', payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulador tributário"
        description="Compara hipóteses de cálculo entre regimes com premissas editáveis. Não substitui a apuração oficial das obrigações legais."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo cenário
          </Button>
        }
      />

      <div className="surface-card flex items-start gap-3 border-warning/40 bg-warning/10 p-4 text-xs leading-relaxed">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(30_60%_32%)] dark:text-warning" />
        <p>
          <strong className="font-semibold">Hipótese, não obrigação.</strong> {TAX_DISCLAIMER} As alíquotas usadas são
          valores de referência e as premissas (faturamento, margem, ISS, DAS) são suas — atualize-as sempre que a
          realidade mudar.
        </p>
      </div>

      {scenarios.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Nenhum cenário cadastrado"
          description="Cadastre um cenário com faturamento e premissas para comparar as estimativas de tributos entre MEI, Simples Nacional, Lucro Presumido e Lucro Real."
          action={
            <Button
              size="sm"
              className="mt-1"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Criar cenário
            </Button>
          }
        />
      ) : (
        <>
          <div className="surface-card flex flex-wrap items-center gap-3 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cenário</span>
            <Select value={selected?.id} onValueChange={setSelectedId}>
              <SelectTrigger className="h-9 w-full text-xs sm:w-[18rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((scenario) => (
                  <SelectItem key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected ? (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <Badge variant="outline">{ACTIVITIES.find((item) => item.value === selected.activity)?.label || 'Atividade'}</Badge>
                <span>
                  Faturamento mensal de <Money value={selected.monthly_revenue} />
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Ações do cenário">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => {
                        setEditing(selected);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar premissas
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setRemoving(selected)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir cenário
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : null}
          </div>

          {comparison ? (
            <>
              {!comparison.hasData ? (
                <div className="surface-card p-4 text-xs text-muted-foreground">
                  Informe o faturamento mensal do cenário para que as estimativas sejam calculadas.
                </div>
              ) : null}

              <SectionCard
                title="Estimativas por regime"
                description="Cálculo sobre o faturamento mensal informado. O regime destacado é apenas o de menor custo estimado nesta hipótese."
              >
                <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  <table className="w-full min-w-[40rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-3 font-semibold">Regime</th>
                        <th className="py-2 pr-3 text-right font-semibold">Estimativa mensal</th>
                        <th className="py-2 pr-3 text-right font-semibold">Estimativa anual</th>
                        <th className="py-2 pr-3 text-right font-semibold">Alíquota efetiva</th>
                        <th className="py-2 font-semibold">Observações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.estimates.map((estimate) => {
                        const regime = REGIMES.find((item) => item.value === estimate.regime);
                        const isBest = comparison.best === estimate.regime;
                        return (
                          <tr key={estimate.regime} className="border-b border-border/40 align-top last:border-0">
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{regime?.label || estimate.regime}</span>
                                {isBest ? (
                                  <Badge variant="secondary" className="text-[10px]">
                                    menor custo estimado
                                  </Badge>
                                ) : null}
                                {estimate.insufficient ? (
                                  <Badge variant="outline" className="text-[10px]">
                                    premissas insuficientes
                                  </Badge>
                                ) : null}
                              </div>
                            </td>
                            <td className="py-3 pr-3 text-right font-medium">
                              <Money value={estimate.monthlyTax} />
                            </td>
                            <td className="py-3 pr-3 text-right">
                              <Money value={estimate.annualTax} />
                            </td>
                            <td className="tabular py-3 pr-3 text-right">
                              {estimate.effectiveRate === null ? '—' : formatPercent(estimate.effectiveRate, 2)}
                            </td>
                            <td className="py-3 text-[11px] leading-relaxed text-muted-foreground">
                              {(estimate.notes || []).join(' ')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <div className="grid gap-4 lg:grid-cols-2">
                {comparison.estimates
                  .filter((estimate) => estimate.breakdown)
                  .map((estimate) => (
                    <SectionCard
                      key={`${estimate.regime}-breakdown`}
                      title={`Composição — ${REGIMES.find((item) => item.value === estimate.regime)?.label}`}
                      description="Componentes considerados nesta hipótese de cálculo."
                    >
                      <ul className="space-y-2">
                        {estimate.breakdown.map((item) => (
                          <li key={item.label} className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-muted-foreground">{item.label}</span>
                            <Money value={item.value} className="font-medium" />
                          </li>
                        ))}
                      </ul>
                    </SectionCard>
                  ))}
              </div>
            </>
          ) : null}
        </>
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Editar cenário' : 'Novo cenário'}
        description="Atualize as premissas sempre que faturamento, margem ou regime mudarem."
        columns={2}
        initialValues={editing || { name: '', activity: 'servicos', service_annex: 'III', monthly_revenue: '', annual_revenue: '', profit_margin_percent: '20', iss_percent: '5', mei_das: '76', notes: '' }}
        fields={FIELDS}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Excluir cenário"
        description={removing ? `"${removing.name}" sairá das comparações.` : ''}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => remove('TaxScenario', removing.id)}
      />
    </div>
  );
}