import React from 'react';
import { cn } from '@/lib/utils';

export default function PageHeader({ title, description, actions, badge, className }) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {badge}
        </div>
        {description ? <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}