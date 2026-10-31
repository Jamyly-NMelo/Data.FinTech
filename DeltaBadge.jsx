{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "81c62c0a",
   "metadata": {},
   "outputs": [],
   "source": [
    "import React from 'react';\n",
    "import { cn } from '@/lib/utils';\n",
    "import { formatVariation } from '@/lib/format';\n",
    "import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';\n",
    "\n",
    "/** Variação em relação ao período anterior. */\n",
    "export default function DeltaBadge({ value, invert = false, label = 'vs. período anterior', className }) {\n",
    "  if (value === null || value === undefined) {\n",
    "    return <span className={cn('text-xs text-muted-foreground', className)}>— sem base de comparação</span>;\n",
    "  }\n",
    "\n",
    "  const isUp = value > 0.05;\n",
    "  const isDown = value < -0.05;\n",
    "  const positive = invert ? isDown : isUp;\n",
    "  const negative = invert ? isUp : isDown;\n",
    "  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;\n",
    "\n",
    "  return (\n",
    "    <span className={cn('inline-flex items-center gap-1 text-xs font-medium', className)}>\n",
    "      <span\n",
    "        className={cn(\n",
    "          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5',\n",
    "          positive && 'bg-success/15 text-success',\n",
    "          negative && 'bg-destructive/15 text-destructive',\n",
    "          !positive && !negative && 'bg-muted text-muted-foreground',\n",
    "        )}\n",
    "      >\n",
    "        <Icon className=\"h-3 w-3\" />\n",
    "        {formatVariation(value)}\n",
    "      </span>\n",
    "      <span className=\"text-muted-foreground\">{label}</span>\n",
    "    </span>\n",
    "  );\n",
    "}"
   ]
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
