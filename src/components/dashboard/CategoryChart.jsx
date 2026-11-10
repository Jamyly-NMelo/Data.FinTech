import React, { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import EmptyState from '@/components/common/EmptyState';
import SectionCard from '@/components/common/SectionCard';
import { categoryBreakdown } from '@/lib/finance/metrics';
import { formatCurrency, formatPercent } from '@/lib/format';
import { useChartTheme } from '@/lib/chart-theme';

export default function CategoryChart({ transactions = [], categories = [] }) {
  const rows = useMemo(() => categoryBreakdown(transactions, categories), [transactions, categories]);
  const theme = useChartTheme();
  const fallbackColors = theme.colors;

  return (
    <SectionCard title="Despesas por categoria" description="Distribuição das despesas liquidadas no período selecionado.">
      {rows.length === 0 ? (
        <EmptyState compact title="Sem despesas categorizadas" description="As despesas liquidadas aparecerão aqui." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,0.8fr)]">
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={rows} dataKey="value" nameKey="name" innerRadius="54%" outerRadius="82%" paddingAngle={2}>
                  {rows.map((row, index) => <Cell key={row.category_id} fill={row.color || fallbackColors[index % fallbackColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={theme.tooltip} formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="max-h-56 space-y-2 overflow-y-auto py-2">
            {rows.map((row, index) => (
              <li key={row.category_id} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color || fallbackColors[index % fallbackColors.length] }} />
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                <span className="text-right text-muted-foreground">{formatPercent(row.share, 1)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
