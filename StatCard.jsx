{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "e88e5497",
   "metadata": {},
   "outputs": [],
   "source": [
    "import React from 'react';\n",
    "import { cn } from '@/lib/utils';\n",
    "import { Card, CardContent } from '@/components/ui/card';\n",
    "import DeltaBadge from '@/components/common/DeltaBadge';\n",
    "\n",
    "const TONES = {\n",
    "  neutral: 'bg-muted text-foreground',\n",
    "  navy: 'bg-brand-navy/10 text-brand-navy dark:bg-primary/15 dark:text-primary',\n",
    "  mint: 'bg-success/15 text-success',\n",
    "  amber: 'bg-warning/20 text-[hsl(30_60%_28%)] dark:text-warning',\n",
    "  danger: 'bg-destructive/15 text-destructive',\n",
    "};\n",
    "\n",
    "export default function StatCard({\n",
    "  label,\n",
    "  value,\n",
    "  hint,\n",
    "  delta,\n",
    "  invertDelta = false,\n",
    "  deltaLabel,\n",
    "  icon: Icon,\n",
    "  tone = 'neutral',\n",
    "  className,\n",
    "}) {\n",
    "  return (\n",
    "    <Card className={cn('surface-card animate-fade-up', className)}>\n",
    "      <CardContent className=\"flex flex-col gap-3 p-5\">\n",
    "        <div className=\"flex items-start justify-between gap-3\">\n",
    "          <span className=\"text-xs font-semibold uppercase tracking-wide text-muted-foreground\">{label}</span>\n",
    "          {Icon ? (\n",
    "            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', TONES[tone] || TONES.neutral)}>\n",
    "              <Icon className=\"h-4 w-4\" />\n",
    "            </span>\n",
    "          ) : null}\n",
    "        </div>\n",
    "        <div className=\"text-2xl font-semibold leading-none tracking-tight\">{value}</div>\n",
    "        {delta !== undefined ? <DeltaBadge value={delta} invert={invertDelta} label={deltaLabel} /> : null}\n",
    "        {hint ? <p className=\"text-xs leading-relaxed text-muted-foreground\">{hint}</p> : null}\n",
    "      </CardContent>\n",
    "    </Card>\n",
    "  );\n",
    "}"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "90d45695",
   "metadata": {},
   "outputs": [],
   "source": []
  }
 ],
 "metadata": {
  "language_info": {
   "name": "python"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 5
}
