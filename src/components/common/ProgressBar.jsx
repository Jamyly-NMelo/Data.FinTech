import React from 'react';
import { cn } from '@/lib/utils';

/** Barra de progresso simples, com controle total da cor. */
export default function ProgressBar({ value, className, barClassName }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div
        className={cn('h-full rounded-full bg-primary transition-all', barClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}