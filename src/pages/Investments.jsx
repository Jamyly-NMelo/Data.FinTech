import React, { useMemo, useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import FormDialog from '@/components/common/FormDialog';
import StatCard from '@/components/common/StatCard';
import Money from '@/components/common/Money';
import SectionCard from '@/components/common/SectionCard';
import AllocationChart from '@/components/investments/AllocationChart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useWorkspace } from '@/lib/workspace';
import { usePreferences } from '@/lib/preferences';
import { ASSET_CLASSES, OPERATION_TYPES, assetClassLabel, investmentMetrics, operationAmount, portfolioSummary } from '@/lib/finance/investments';
import { formatDate, formatNumber, formatPercent, todayISO } from '@/lib/format';
import { Coins, MoreHorizontal, Pencil, Plus, Trash2, TrendingUp, Wallet } from 'lucide-react';

const ENV_OPTIONS = [
  { value: 'invest', label: 'Investimentos' },
  { value: 'pf', label: 'Finanças Pessoais' },
  { value: 'pj', label: 'Finanças Empresariais' },
];

const OPERATION_OPTIONS = [
  { value: 'aporte', label: 'Aporte' },
  { value: 'resgate', label: 'Resgate' },
  { value: 'dividendo', label: 'Dividendo' },
  { value: 'jcp', label: 'JCP' },
  { value: 'rendimento', label: 'Rendimento' },
];

export default function Investments() {
  const { investments, operations, create, update, remove } = useWorkspace();
  const { environment } = usePreferences();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [operationOpen, setOperationOpen] = useState(false);
  const [editingOperation, setEditingOperation] = useState(null);
  const [removingInvestment, setRemovingInvestment] = useState(null);
  const [removingOperation, setRemovingOperation] = useState(null);

  const scoped = useMemo(
    () => investments.filter((investment) => environment === 'consolidado' || investment.environment === environment),
    [investments, environment],
  );

  const summary = useMemo(() => portfolioSummary(scoped, operations), [scoped, operations]);

  const recentOperations = useMemo(
    () => [...operations].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 12),
    [operations],
  );

  const investmentOptions = scoped.map((investment) => ({
    value: investment.id,
    label: investment.ticker ? `${investment.ticker} · ${investment.name}` : investment.name,
  }));

  const investmentName = (id) => {
    const investment = investments.find((item) => item.id === id);
    return investment ? investment.ticker || investment.name : 'Ativo removido';
  };

  const handleSubmit = async (values) => {
    if (editing) await update('Investment', editing.id, values);
    else await create('Investment', values);
  };

  const handleOperationSubmit = async (values) => {
    if (editingOperation) await update('InvestmentOperation', editingOperation.id, values);
    else await create('InvestmentOperation', values);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investimentos"
        description="Ativos, aportes, resgates e proventos. A rentabilidade é calculada sobre o que foi efetivamente aportado, nunca sobre valores estimados."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditingOperation(null); setOperationOpen(true); }}>
              <Coins className="mr-2 h-4 w-4" />
              Nova operação
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo ativo
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Valor da carteira" value={<Money value={summary.value} />} icon={TrendingUp} tone="navy" hint={`${scoped.length} posição(ões)`} />
        <StatCard
          label="Resultado"
          value={<Money value={summary.result} colored />}
          tone={summary.result >= 0 ? 'mint' : 'danger'}
          hint={`Rentabilidade de ${formatPercent(summary.profitabilityPercent, 2)} sobre o valor aportado.`}
        />
        <StatCard
          label="Aportes realizados"
          value={<Money value={summary.contributed} />}
          icon={Wallet}
          tone="mint"
          hint={`Resgates de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.withdrawn)} e proventos de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.earnings)}.`}
        />
        <StatCard
          label="Resultado não realizado"
          value={<Money value={summary.unrealized} colored />}
          tone={summary.unrealized >= 0 ? 'mint' : 'danger'}
          hint={`Custo de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.cost)} na cotação atual.`}
        />
      </div>

      {scoped.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Nenhum ativo na carteira"
          description="Cadastre posições com quantidade, preço médio e cotação atual. Registre aportes e resgates para uma rentabilidade fiel."
          action={
            <Button
              size="sm"
              className="mt-1"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Cadastrar ativo
            </Button>
          }
        />
      ) : (
        <>
          <AllocationChart investments={scoped} />

          <SectionCard title="Posições" description="Rentabilidade considera aportes, resgates e proventos registrados para cada ativo.">
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[46rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">Ativo</th>
                    <th className="py-2 pr-3 font-semibold">Classe</th>
                    <th className="py-2 pr-3 text-right font-semibold">Quantidade</th>
                    <th className="py-2 pr-3 text-right font-semibold">Preço médio</th>
                    <th className="py-2 pr-3 text-right font-semibold">Cotação</th>
                    <th className="py-2 pr-3 text-right font-semibold">Valor</th>
                    <th className="py-2 pr-3 text-right font-semibold">Rentabilidade</th>
                    <th className="py-2 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {scoped.map((investment) => {
                    const metrics = investmentMetrics(investment, operations);
                    return (
                      <tr key={investment.id} className="border-b border-border/40 last:border-0">
                        <td className="py-3 pr-3">
                          <p className="font-medium">{investment.ticker || investment.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {investment.ticker ? investment.name : investment.institution || 'Sem instituição'}
                          </p>
                        </td>
                        <td className="py-3 pr-3">
                          <Badge variant="outline" className="text-[10px]">
                            {assetClassLabel(investment.asset_class)}
                          </Badge>
                        </td>
                        <td className="tabular py-3 pr-3 text-right">{formatNumber(investment.quantity, { decimals: 4 })}</td>
                        <td className="tabular py-3 pr-3 text-right">{formatNumber(investment.avg_price)}</td>
                        <td className="tabular py-3 pr-3 text-right">{formatNumber(investment.current_price)}</td>
                        <td className="py-3 pr-3 text-right font-medium">
                          <Money value={metrics.value} />
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <span className={metrics.result >= 0 ? 'text-success' : 'text-destructive'}>
                            {formatPercent(metrics.profitabilityPercent, 2)}
                          </span>
                          <span className="ml-2 text-[11px] text-muted-foreground">
                            <Money value={metrics.result} signed />
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Ações do ativo">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setEditingOperation(null);
                                  setOperationOpen(true);
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Nova operação
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setEditing(investment);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar posição
                              </DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setRemovingInvestment(investment)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir ativo
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}

      <SectionCard title="Operações recentes" description="Aportes, resgates e proventos usados no cálculo da rentabilidade.">
        {recentOperations.length === 0 ? (
          <EmptyState icon={Coins} compact title="Sem operações registradas" description="Registre aportes e resgates para acompanhar a rentabilidade real." />
        ) : (
          <ul className="divide-y divide-border/60">
            {recentOperations.map((operation) => (
              <li key={operation.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {OPERATION_OPTIONS.find((item) => item.value === operation.type)?.label || operation.type}
                  </Badge>
                  <span className="text-sm">{investmentName(operation.investment_id)}</span>
                  <span className="text-[11px] text-muted-foreground">{formatDate(operation.date)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Money value={operationAmount(operation)} className="text-sm font-medium" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Ações da operação">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => {
                          setEditingOperation(operation);
                          setOperationOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setRemovingOperation(operation)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Editar posição' : 'Novo ativo'}
        columns={2}
        initialValues={editing || { name: '', ticker: '', asset_class: 'renda_fixa', environment: environment === 'consolidado' ? 'invest' : environment, institution: '', quantity: '', avg_price: '', current_price: '', quote_date: todayISO(), notes: '' }}
        fields={[
          { name: 'name', label: 'Nome do ativo', type: 'text', required: true, placeholder: 'Ex.: Tesouro Selic 2029' },
          { name: 'ticker', label: 'Código', type: 'text', placeholder: 'Ex.: PETR4' },
          { name: 'asset_class', label: 'Classe', type: 'select', options: ASSET_CLASSES, required: true },
          { name: 'institution', label: 'Instituição', type: 'text', placeholder: 'Ex.: Corretora' },
          { name: 'quantity', label: 'Quantidade', type: 'number', placeholder: '0' },
          { name: 'avg_price', label: 'Preço médio', type: 'currency', placeholder: '0,00' },
          { name: 'current_price', label: 'Cotação atual', type: 'currency', placeholder: '0,00' },
          { name: 'quote_date', label: 'Data da cotação', type: 'date' },
          { name: 'environment', label: 'Ambiente', type: 'select', options: ENV_OPTIONS, required: true },
          { name: 'notes', label: 'Observações', type: 'textarea', colSpan: 2 },
        ]}
        onSubmit={handleSubmit}
      />

      <FormDialog
        open={operationOpen}
        onOpenChange={setOperationOpen}
        title={editingOperation ? 'Editar operação' : 'Nova operação'}
        description="Aportes e resgates alimentam a rentabilidade; proventos entram como resultado recebido."
        columns={2}
        initialValues={editingOperation || { investment_id: '', type: 'aporte', date: todayISO(), quantity: '', price: '', fees: '0', notes: '' }}
        fields={[
          { name: 'investment_id', label: 'Ativo', type: 'select', required: true, options: investmentOptions, colSpan: 2 },
          { name: 'type', label: 'Tipo', type: 'select', options: OPERATION_OPTIONS, required: true },
          { name: 'date', label: 'Data', type: 'date', required: true },
          { name: 'quantity', label: 'Quantidade', type: 'number', placeholder: '0' },
          { name: 'price', label: 'Preço unitário', type: 'currency', placeholder: '0,00' },
          { name: 'fees', label: 'Taxas', type: 'currency', placeholder: '0,00' },
          { name: 'notes', label: 'Observações', type: 'textarea', colSpan: 2 },
        ]}
        onSubmit={handleOperationSubmit}
      />

      <ConfirmDialog
        open={Boolean(removingInvestment)}
        onOpenChange={(open) => !open && setRemovingInvestment(null)}
        title="Excluir ativo"
        description={removingInvestment ? `"${removingInvestment.name}" sairá da carteira. As operações vinculadas devem ser removidas manualmente.` : ''}
        confirmLabel="Excluir ativo"
        destructive
        onConfirm={() => remove('Investment', removingInvestment.id)}
      />

      <ConfirmDialog
        open={Boolean(removingOperation)}
        onOpenChange={(open) => !open && setRemovingOperation(null)}
        title="Excluir operação"
        description="A operação sai do cálculo de rentabilidade do ativo."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => remove('InvestmentOperation', removingOperation.id)}
      />
    </div>
  );
}