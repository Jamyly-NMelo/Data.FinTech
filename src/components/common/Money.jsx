import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency, MASKED_VALUE } from '@/lib/format';
import { usePreferences } from '@/lib/preferences';
import { toNumber } from '@/lib/finance/money';

/**
 * Exibe um valor monetário. Com o modo privacidade ativo, o valor
 * é ocultado em toda a interface.
 */
export default function Money({
  value,
  className,
  compact = false,
  signed = false,
  colored = false,
  maskable = true,
}) {
  const { privacy } = usePreferences();
  const amount = toNumber(value);
  const hidden = privacy && maskable;
  const sign = signed && amount > 0 ? '+' : '';
  const text = hidden ? MASKED_VALUE : `${sign}${formatCurrency(amount, { compact })}`;
  const tone = colored ? (amount > 0 ? 'text-success' : amount < 0 ? 'text-destructive' : '') : '';

  return (
    <span className={cn('tabular', tone, className)} title={hidden ? undefined : formatCurrency(amount)}>
      {text}
    </span>
  );
}