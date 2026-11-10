import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import EmptyState from '@/components/common/EmptyState';
import SectionCard from '@/components/common/SectionCard';
import { formatCurrency, formatMonthLabel } from '@/lib/format';
import { useChartTheme } from '@/lib/chart-theme';

export default function ProjectionPanel({ projection = [] }) {
  const theme = useChartTheme();
  return (
    <SectionCard title="Projeção de caixa" description="Pendências registradas ou, quando não há pendências, média realizada dos últimos meses.">
      {projection.length === 0 ? (
        <EmptyState compact title="Sem dados para projetar" description="Cadastre contas e lançamentos para acompanhar o caixa futuro." />
      ) : (
        <>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projection} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.colors[0]} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={theme.colors[0]} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="month" tickFormatter={formatMonthLabel} tick={{ fill: theme.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => formatCurrency(value, { compact: true })} tick={{ fill: theme.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={62} />
                <Tooltip contentStyle={theme.tooltip} labelFormatter={formatMonthLabel} formatter={(value, name) => [formatCurrency(value), name === 'projected' ? 'Saldo projetado' : name]} />
                <Area type="monotone" dataKey="projected" name="projected" stroke={theme.colors[0]} fill="url(#projectionFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground">Projeção indicativa, não representa saldo realizado.</p>
        </>
      )}
    </SectionCard>
  );
}
