import React, { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import EmptyState from '@/components/common/EmptyState';
import SectionCard from '@/components/common/SectionCard';
import { allocationByClass } from '@/lib/finance/investments';
import { formatCurrency, formatPercent } from '@/lib/format';
import { useChartTheme } from '@/lib/chart-theme';

export default function AllocationChart({ investments = [] }) {
  const rows = useMemo(() => allocationByClass(investments), [investments]);
  const theme = useChartTheme();

  return (
    <SectionCard title="Alocação por classe" description="Participação de cada classe no valor atual da carteira.">
      {rows.length === 0 ? (
        <EmptyState compact title="Carteira vazia" description="Cadastre ativos para ver a distribuição." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,0.8fr)]">
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rows} dataKey="value" nameKey="label" innerRadius="54%" outerRadius="82%" paddingAngle={2}>
                  {rows.map((row, index) => <Cell key={row.asset_class} fill={theme.colors[index % theme.colors.length]} />)}
                </Pie>
                <Tooltip contentStyle={theme.tooltip} formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-2 py-2">
            {rows.map((row, index) => (
              <li key={row.asset_class} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: theme.colors[index % theme.colors.length] }} />
                <span className="min-w-0 flex-1 truncate">{row.label}</span>
                <span className="text-right text-muted-foreground">{formatPercent(row.share, 1)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
