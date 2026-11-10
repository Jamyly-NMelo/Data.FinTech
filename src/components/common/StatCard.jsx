import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import DeltaBadge from '@/components/common/DeltaBadge';

const TONES = {
  neutral: 'bg-muted text-foreground',
  navy: 'bg-brand-navy/10 text-brand-navy dark:bg-primary/15 dark:text-primary',
  mint: 'bg-success/15 text-success',
  amber: 'bg-warning/20 text-[hsl(30_60%_28%)] dark:text-warning',
  danger: 'bg-destructive/15 text-destructive',
};

export default function StatCard({
  label,
  value,
  hint,
  delta,
  invertDelta = false,
  deltaLabel,
  icon: Icon,
  tone = 'neutral',
  className,
}) {
  return (
    <Card className={cn('surface-card animate-fade-up', className)}>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
          {Icon ? (
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', TONES[tone] || TONES.neutral)}>
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
        </div>
        <div className="text-2xl font-semibold leading-none tracking-tight">{value}</div>
        {delta !== undefined ? <DeltaBadge value={delta} invert={invertDelta} label={deltaLabel} /> : null}
        {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}