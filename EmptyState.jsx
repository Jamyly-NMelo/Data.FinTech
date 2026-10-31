{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "db37b7f2",
   "metadata": {},
   "outputs": [],
   "source": [
    "import React from 'react';\n",
    "import { cn } from '@/lib/utils';\n",
    "\n",
    "export default function EmptyState({ icon: Icon, title, description, action, className, compact = false }) {\n",
    "  return (\n",
    "    <div\n",
    "      className={cn(\n",
    "        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/60 text-center',\n",
    "        compact ? 'gap-2 p-6' : 'gap-3 p-10',\n",
    "        className,\n",
    "      )}\n",
    "    >\n",
    "      {Icon ? (\n",
    "        <span className=\"flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground\">\n",
    "          <Icon className=\"h-5 w-5\" />\n",
    "        </span>\n",
    "      ) : null}\n",
    "      <div className=\"space-y-1\">\n",
    "        <p className=\"font-heading text-sm font-semibold text-foreground\">{title}</p>\n",
    "        {description ? <p className=\"mx-auto max-w-md text-xs leading-relaxed text-muted-foreground\">{description}</p> : null}\n",
    "      </div>\n",
    "      {action}\n",
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
