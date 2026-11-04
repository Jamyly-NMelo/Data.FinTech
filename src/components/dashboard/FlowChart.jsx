import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import SectionCard from '@/components/common/SectionCard';
import EmptyState from '@/components/common/EmptyState';
import { monthlyFlow } from '@/lib/finance/metrics';
import { formatCurrency, formatMonthLabel } from '@/lib/format';
import { useChartTheme } from '@/lib/chart-theme';

export default function FlowChart({ transactions = [], months = 6 }) {
  const rows = useMemo(() => monthlyFlow(transactions, months), [transactions, months]);
  const theme = useChartTheme();

  return (
    <SectionCard title="Receitas e despesas" description="Valores liquidados por mês, sem transferências internas.">
      {rows.every((row) => row.income === 0 && row.expense === 0) ? (
        <EmptyState compact title="Sem movimentação no período" description="Receitas e despesas liquidadas aparecerão aqui." />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="month" tickFormatter={formatMonthLabel} tick={{ fill: theme.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(value) => formatCurrency(value, { compact: true })} tick={{ fill: theme.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={62} />
              <Tooltip
                contentStyle={theme.tooltip}
                labelFormatter={formatMonthLabel}
                formatter={(value, name) => [formatCurrency(value), name === 'income' ? 'Receitas' : 'Despesas']}
              />
              <Legend formatter={(name) => name === 'income' ? 'Receitas' : 'Despesas'} />
              <Bar dataKey="income" name="income" fill={theme.income} radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="expense" fill={theme.expense} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}
