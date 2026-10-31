{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "325e0afc",
   "metadata": {},
   "outputs": [],
   "source": [
    "import React from 'react';\n",
    "import { cn } from '@/lib/utils';\n",
    "import { formatCurrency, MASKED_VALUE } from '@/lib/format';\n",
    "import { usePreferences } from '@/lib/preferences';\n",
    "import { toNumber } from '@/lib/finance/money';\n",
    "\n",
    "/**\n",
    " * Exibe um valor monetário. Com o modo privacidade ativo, o valor\n",
    " * é ocultado em toda a interface.\n",
    " */\n",
    "export default function Money({\n",
    "  value,\n",
    "  className,\n",
    "  compact = false,\n",
    "  signed = false,\n",
    "  colored = false,\n",
    "  maskable = true,\n",
    "}) {\n",
    "  const { privacy } = usePreferences();\n",
    "  const amount = toNumber(value);\n",
    "  const hidden = privacy && maskable;\n",
    "  const sign = signed && amount > 0 ? '+' : '';\n",
    "  const text = hidden ? MASKED_VALUE : `${sign}${formatCurrency(amount, { compact })}`;\n",
    "  const tone = colored ? (amount > 0 ? 'text-success' : amount < 0 ? 'text-destructive' : '') : '';\n",
    "\n",
    "  return (\n",
    "    <span className={cn('tabular', tone, className)} title={hidden ? undefined : formatCurrency(amount)}>\n",
    "      {text}\n",
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
