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
import { useWorkspace } from '@/lib/workspace';
import { pricingAnalysis } from '@/lib/finance/pricing';
import { formatNumber, formatPercent } from '@/lib/format';
import { AlertTriangle, Calculator, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';

const FIELDS = [
  { name: 'name', label: 'Produto ou serviço', type: 'text', required: true, placeholder: 'Ex.: Consultoria mensal', colSpan: 2 },
  { name: 'unit_name', label: 'Unidade', type: 'text', placeholder: 'Ex.: hora, projeto, unidade' },
  { name: 'variable_cost', label: 'Custo variável por unidade', type: 'currency', placeholder: '0,00' },
  { name: 'fixed_cost_monthly', label: 'Custo fixo mensal', type: 'currency', placeholder: '0,00' },
  { name: 'expected_monthly_units', label: 'Volume mensal esperado', type: 'number', placeholder: '0' },
  { name: 'tax_percent', label: 'Impostos sobre o preço (%)', type: 'percent', placeholder: '0' },
  { name: 'commission_percent', label: 'Comissão sobre o preço (%)', type: 'percent', placeholder: '0' },
  { name: 'desired_margin_percent', label: 'Margem desejada (%)', type: 'percent', placeholder: '0' },
  { name: 'current_price', label: 'Preço praticado', type: 'currency', placeholder: '0,00' },
  { name: 'notes', label: 'Observações', type: 'textarea', colSpan: 2 },
];

export default function Pricing() {
  const { pricings, create, update, remove } = useWorkspace();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const rows = useMemo(
    () => pricings.map((item) => ({ item, analysis: pricingAnalysis(item) })),
    [pricings],
  );

  const handleSubmit = async (values) => {
    const payload = { ...values, environment: 'pj' };
    if (editing) await update('Pricing', editing.id, payload);
    else await create('Pricing', payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Precificação"
        description="Margem, markup, ponto de equilíbrio e preço sugerido a partir dos seus custos e premissas. Percentuais incompatíveis são recusados com alerta."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo item
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Calculator}
          title="Nenhum item precificado"
          description="Cadastre produtos ou serviços com custos, impostos e margem desejada para calcular o preço ideal."
          action={
            <Button
              size="sm"
              className="mt-1"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Cadastrar item
            </Button>
          }
        />
      ) : (
        <SectionCard title="Análise por item" description="Preço sugerido = (custo + custo fixo por unidade) ÷ (1 − margem − impostos − comissão).">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[52rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Item</th>
                  <th className="py-2 pr-3 text-right font-semibold">Preço praticado</th>
                  <th className="py-2 pr-3 text-right font-semibold">Preço sugerido</th>
                  <th className="py-2 pr-3 text-right font-semibold">Margem</th>
                  <th className="py-2 pr-3 text-right font-semibold">Markup</th>
                  <th className="py-2 pr-3 text-right font-semibold">Ponto de equilíbrio</th>
                  <th className="py-2 pr-3 text-right font-semibold">Lucro mensal</th>
                  <th className="py-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ item, analysis }) => (
                  <tr key={item.id} className="border-b border-border/40 align-top last:border-0">
                    <td className="py-3 pr-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.unit_name || 'unidade'} · volume {formatNumber(item.expected_monthly_units, { decimals: 0 })}
                      </p>
                      {analysis.alerts.length ? (
                        <p className="mt-1 flex items-start gap-1 text-[11px] text-[hsl(30_60%_32%)] dark:text-warning">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          {analysis.alerts[0]}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <Money value={item.current_price} />
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {analysis.suggestedPrice === null ? (
                        <Badge variant="destructive" className="text-[10px]">
                          inviável
                        </Badge>
                      ) : (
                        <Money value={analysis.suggestedPrice} />
                      )}
                    </td>
                    <td className="tabular py-3 pr-3 text-right">{formatPercent(analysis.marginPercent, 1)}</td>
                    <td className="tabular py-3 pr-3 text-right">
                      {analysis.markupPercent === null ? '—' : formatPercent(analysis.markupPercent, 1)}
                    </td>
                    <td className="tabular py-3 pr-3 text-right">
                      {analysis.breakEvenUnits === null ? '—' : `${formatNumber(analysis.breakEvenUnits, { decimals: 0 })} un.`}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <Money value={analysis.monthlyProfit} colored />
                    </td>
                    <td className="py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Ações do item">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => {
                              setEditing(item);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar premissas
                          </DropdownMenuItem>
                          {analysis.suggestedPrice !== null ? (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => update('Pricing', item.id, { current_price: analysis.suggestedPrice })}
                            >
                              Aplicar preço sugerido
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setRemoving(item)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Editar premissas' : 'Novo item'}
        description="Custos fixos são distribuídos por unidade quando há volume esperado informado."
        columns={2}
        initialValues={editing || { name: '', unit_name: '', variable_cost: '', fixed_cost_monthly: '', expected_monthly_units: '', tax_percent: '', commission_percent: '', desired_margin_percent: '', current_price: '', notes: '' }}
        fields={FIELDS}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Excluir item"
        description={removing ? `"${removing.name}" sairá da análise de precificação.` : ''}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => remove('Pricing', removing.id)}
      />
    </div>
  );
}