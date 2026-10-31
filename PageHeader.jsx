{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "34e98a8c",
   "metadata": {},
   "outputs": [],
   "source": [
    "import React from 'react';\n",
    "import { cn } from '@/lib/utils';\n",
    "\n",
    "export default function PageHeader({ title, description, actions, badge, className }) {\n",
    "  return (\n",
    "    <header className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>\n",
    "      <div className=\"space-y-1.5\">\n",
    "        <div className=\"flex items-center gap-2\">\n",
    "          <h1 className=\"font-heading text-2xl font-bold tracking-tight sm:text-3xl\">{title}</h1>\n",
    "          {badge}\n",
    "        </div>\n",
    "        {description ? <p className=\"max-w-2xl text-sm leading-relaxed text-muted-foreground\">{description}</p> : null}\n",
    "      </div>\n",
    "      {actions ? <div className=\"flex flex-wrap items-center gap-2\">{actions}</div> : null}\n",
    "    </header>\n",
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
