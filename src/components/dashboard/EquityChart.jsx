import React, { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import EmptyState from '@/components/common/EmptyState';
import SectionCard from '@/components/common/SectionCard';
import { equityEvolution } from '@/lib/finance/metrics';
import { formatCurrency, formatMonthLabel } from '@/lib/format';
import { useChartTheme } from '@/lib/chart-theme';

export default function EquityChart({ accounts = [], transactions = [], investments = [] }) {
  const rows = useMemo(() => equityEvolution(accounts, transactions, investments), [accounts, transactions, investments]);
  const theme = useChartTheme();

  return (
    <SectionCard title="Evolução patrimonial" description="Saldos liquidados nas contas mais o valor atual da carteira.">
      {accounts.length === 0 && investments.length === 0 ? (
        <EmptyState compact title="Sem ativos cadastrados" description="Contas e investimentos aparecerão aqui." />
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.income} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={theme.income} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="month" tickFormatter={formatMonthLabel} tick={{ fill: theme.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(value) => formatCurrency(value, { compact: true })} tick={{ fill: theme.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={62} />
              <Tooltip contentStyle={theme.tooltip} labelFormatter={formatMonthLabel} formatter={(value) => formatCurrency(value)} />
              <Area type="monotone" dataKey="equity" name="Patrimônio" stroke={theme.income} fill="url(#equityFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}
