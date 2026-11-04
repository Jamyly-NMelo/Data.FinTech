import React, { useMemo } from 'react';
import EmptyState from '@/components/common/EmptyState';
import Money from '@/components/common/Money';
import SectionCard from '@/components/common/SectionCard';
import { Badge } from '@/components/ui/badge';
import { buildLiquidity, LIQUIDITY_STATUS_LABELS } from '@/lib/finance/liquidity';
import { formatNumber } from '@/lib/format';

const Ratio = ({ label, value, status, message }) => (
  <div className="rounded-xl border border-border/70 p-3">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-medium">{label}</p>
      <Badge variant={status === 'saudavel' ? 'secondary' : status === 'critico' ? 'destructive' : 'outline'}>
        {LIQUIDITY_STATUS_LABELS[status]}
      </Badge>
    </div>
    <p className="mt-2 font-heading text-xl font-semibold">{value === null ? '—' : `${formatNumber(value, { decimals: 2 })}×`}</p>
    {message ? <p className="mt-1 text-[10px] text-muted-foreground">{message}</p> : null}
  </div>
);

const AmountRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 text-xs">
    <span className="text-muted-foreground">{label}</span>
    <Money value={value} className="font-medium" />
  </div>
);

export default function LiquidityPanel({ accounts = [], transactions = [], range }) {
  const data = useMemo(() => buildLiquidity({ accounts, transactions, range, environment: 'pj' }), [accounts, transactions, range]);

  return (
    <SectionCard title="Liquidez empresarial" description={`Indicadores de curto prazo em ${data.referenceDate}.`}>
      {!data.hasData ? (
        <EmptyState compact title="Sem dados de liquidez" description="Cadastre contas e lançamentos no ambiente empresarial." />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Ratio label="Liquidez corrente" value={data.currentRatio} status={data.currentStatus} message="Ativo circulante ÷ passivo circulante" />
            <Ratio label="Liquidez imediata" value={data.quickRatio} status={data.quickStatus} message="Disponibilidades ÷ passivo circulante" />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ativo circulante</h3>
              <AmountRow label="Disponibilidades" value={data.available} />
              <AmountRow label="Contas a receber" value={data.receivables} />
              <AmountRow label="Total" value={data.currentAssets} />
            </div>
            <div className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Passivo circulante</h3>
              <AmountRow label="Contas a pagar" value={data.payables} />
              <AmountRow label="Faturas de cartão" value={data.cardInvoices} />
              <AmountRow label="Saldos negativos em contas" value={data.overdrafts} />
              <AmountRow label="Total" value={data.currentLiabilities} />
            </div>
          </div>
          {data.notApplicableMessage ? <p className="text-xs text-muted-foreground">{data.notApplicableMessage}</p> : null}
          {data.afterReference.count ? (
            <p className="text-[11px] text-muted-foreground">
              {data.afterReference.count} pendência(s) após a data de referência não entram no cálculo:
              {' '}recebíveis <Money value={data.afterReference.receivables} /> · pagamentos <Money value={data.afterReference.payables} />.
            </p>
          ) : null}
          {data.warnings.length ? <ul className="space-y-1 text-[11px] text-muted-foreground">{data.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
        </div>
      )}
    </SectionCard>
  );
}
