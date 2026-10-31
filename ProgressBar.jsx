{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "c01bf205",
   "metadata": {},
   "outputs": [],
   "source": [
    "import React from 'react';\n",
    "import { cn } from '@/lib/utils';\n",
    "\n",
    "/** Barra de progresso simples, com controle total da cor. */\n",
    "export default function ProgressBar({ value, className, barClassName }) {\n",
    "  const percent = Math.max(0, Math.min(100, Number(value) || 0));\n",
    "  return (\n",
    "    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>\n",
    "      <div\n",
    "        className={cn('h-full rounded-full bg-primary transition-all', barClassName)}\n",
    "        style={{ width: `${percent}%` }}\n",
    "      />\n",
    "    </div>\n",
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
