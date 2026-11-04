import React, { useMemo } from 'react';
import EmptyState from '@/components/common/EmptyState';
import Money from '@/components/common/Money';
import SectionCard from '@/components/common/SectionCard';
import { Badge } from '@/components/ui/badge';
import { LIABILITY_BUCKETS, liabilitySummary } from '@/lib/finance/liabilities';
import { formatDate } from '@/lib/format';

const bucketVariant = (bucket) => {
  if (bucket === 'overdue') return 'destructive';
  if (bucket === 'unclassified') return 'outline';
  if (bucket === 'settled') return 'secondary';
  return 'default';
};

export default function LiabilityBreakdown({ debts = [] }) {
  const summary = useMemo(() => liabilitySummary(debts), [debts]);

  return (
    <SectionCard title="Composição do passivo" description="Classificação de curto e longo prazo, sem estimar valores ausentes.">
      {summary.rows.length === 0 ? (
        <EmptyState compact title="Nenhuma dívida cadastrada" description="As dívidas acompanhadas aparecerão nesta composição." />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] text-muted-foreground">Circulante</p><Money value={summary.circulating} className="mt-1 block font-semibold" /></div>
            <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] text-muted-foreground">Não circulante</p><Money value={summary.nonCirculating} className="mt-1 block font-semibold" /></div>
            <div className="rounded-xl bg-muted/40 p-3"><p className="text-[10px] text-muted-foreground">Não classificado</p><Money value={summary.unclassifiedTotal} className="mt-1 block font-semibold" /></div>
          </div>
          <ul className="divide-y divide-border/60">
            {summary.rows.map((row) => (
              <li key={row.debt.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.debt.name}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {row.debt.creditor || 'Credor não informado'}{row.maturityDate ? ` · vencimento ${formatDate(row.maturityDate)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={bucketVariant(row.bucket)}>{LIABILITY_BUCKETS[row.bucket]}</Badge>
                  <Money value={row.outstanding} className="font-semibold" />
                </div>
              </li>
            ))}
          </ul>
          {summary.warnings.length ? <ul className="space-y-1 text-[11px] text-muted-foreground">{summary.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
        </div>
      )}
    </SectionCard>
  );
}
