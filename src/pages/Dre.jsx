import React, { useMemo, useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import FilterBar, { DEFAULT_FILTERS } from '@/components/common/FilterBar';
import EmptyState from '@/components/common/EmptyState';
import StatCard from '@/components/common/StatCard';
import Money from '@/components/common/Money';
import SectionCard from '@/components/common/SectionCard';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/lib/workspace';
import { buildDre, GROUP_LABELS } from '@/lib/finance/dre';
import { resolveRange } from '@/lib/finance/periods';
import { formatPercent } from '@/lib/format';
import { AlertTriangle, BarChart3 } from 'lucide-react';

export default function Dre() {
  const { transactions, categories } = useWorkspace();
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, period: 'current_month' });

  const range = useMemo(() => resolveRange(filters.period, { from: filters.from, to: filters.to }), [filters]);

  const dre = useMemo(
    () =>
      buildDre({
        transactions,
        categories,
        range,
        environment: 'pj',
      }),
    [transactions, categories, range],
  );

  const byGroup = useMemo(() => {
    const map = new Map();
    transactions.forEach((transaction) => {
      if (transaction.environment !== 'pj') return;
      const category = categories.find((item) => item.id === transaction.category_id);
      const key = category?.group || 'nao_classificado';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [transactions, categories]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="DRE simplificado"
        description="Resultado empresarial por natureza de gasto, considerando apenas lançamentos liquidados do ambiente PJ."
        badge={
          <Badge variant="outline" className="text-[11px]">
            {range.label}
          </Badge>
        }
      />

      <FilterBar filters={filters} onChange={setFilters} accounts={[]} categories={[]} showStatus={false} />

      {!dre.hasData ? (
        <EmptyState
          icon={BarChart3}
          title="Sem lançamentos liquidados no período"
          description="O DRE usa exclusivamente o que foi efetivamente liquidado. Registre receitas e despesas PJ com categorias classificadas."
          action={
            <div className="mt-2 text-xs text-muted-foreground">
              Classifique suas categorias por grupo (receita, custos, operacional, pessoal, pró-labore, financeiro, impostos) em Configurações.
            </div>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Receita bruta" value={<Money value={dre.totals.receita} />} tone="mint" />
            <StatCard
              label="Margem de contribuição"
              value={<Money value={dre.margemContribuicao} />}
              hint={`${formatPercent(dre.margemPercent, 1)} da receita.`}
              tone="navy"
            />
            <StatCard
              label="Resultado operacional"
              value={<Money value={dre.resultadoOperacional} />}
              hint={`Margem operacional de ${formatPercent(dre.margemOperacionalPercent, 1)}.`}
              tone={dre.resultadoOperacional >= 0 ? 'mint' : 'danger'}
            />
            <StatCard
              label="Resultado líquido"
              value={<Money value={dre.resultadoLiquido} />}
              hint={`Margem líquida de ${formatPercent(dre.margemLiquidaPercent, 1)}.`}
              tone={dre.resultadoLiquido >= 0 ? 'mint' : 'danger'}
            />
          </div>

          {dre.warnings.length ? (
            <div className="surface-card flex items-start gap-2 p-4 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <ul className="space-y-1">
                {dre.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <SectionCard title="Demonstrativo do período" description="Valores líquidos, com transferências internas excluídas.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">Linha</th>
                    <th className="py-2 pr-3 text-right font-semibold">Valor</th>
                    <th className="py-2 text-right font-semibold">% da receita</th>
                  </tr>
                </thead>
                <tbody>
                  {dre.lines.map((line) => (
                    <tr
                      key={line.key}
                      className={
                        line.type === 'total'
                          ? 'border-b border-border/40 bg-muted/40 font-semibold'
                          : line.type === 'subtotal'
                            ? 'border-b border-border/40 font-medium'
                            : 'border-b border-border/40'
                      }
                    >
                      <td className="py-2.5 pr-3">{line.label}</td>
                      <td className="py-2.5 pr-3 text-right">
                        <Money value={line.amount} colored={line.type === 'total'} />
                      </td>
                      <td className="tabular py-2.5 text-right text-xs text-muted-foreground">
                        {formatPercent(line.share ?? (dre.totals.receita > 0 ? (line.amount / dre.totals.receita) * 100 : 0), 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Grupos usados: {Object.values(GROUP_LABELS).join(', ')}.
              {byGroup.size === 0 ? ' Nenhuma categoria classificada encontrada.' : ''}
            </p>
          </SectionCard>
        </>
      )}
    </div>
  );
}