import React from 'react';
import { cn } from '@/lib/utils';
import { formatVariation } from '@/lib/format';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

/** Variação em relação ao período anterior. */
export default function DeltaBadge({ value, invert = false, label = 'vs. período anterior', className }) {
  if (value === null || value === undefined) {
    return <span className={cn('text-xs text-muted-foreground', className)}>— sem base de comparação</span>;
  }

  const isUp = value > 0.05;
  const isDown = value < -0.05;
  const positive = invert ? isDown : isUp;
  const negative = invert ? isUp : isDown;
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5',
          positive && 'bg-success/15 text-success',
          negative && 'bg-destructive/15 text-destructive',
          !positive && !negative && 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="h-3 w-3" />
        {formatVariation(value)}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}