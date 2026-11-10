import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SectionCard({ title, description, action, children, className, contentClassName }) {
  return (
    <Card className={cn('surface-card', className)}>
      {title ? (
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div className="space-y-1">
            <CardTitle className="font-heading text-base font-semibold">{title}</CardTitle>
            {description ? <CardDescription className="text-xs leading-relaxed">{description}</CardDescription> : null}
          </div>
          {action}
        </CardHeader>
      ) : null}
      <CardContent className={cn(title ? 'pt-0' : 'pt-5', contentClassName)}>{children}</CardContent>
    </Card>
  );
}