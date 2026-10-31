{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "724445d5",
   "metadata": {},
   "outputs": [],
   "source": [
    "import React from 'react';\n",
    "import { cn } from '@/lib/utils';\n",
    "import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';\n",
    "\n",
    "export default function SectionCard({ title, description, action, children, className, contentClassName }) {\n",
    "  return (\n",
    "    <Card className={cn('surface-card', className)}>\n",
    "      {title ? (\n",
    "        <CardHeader className=\"flex flex-row items-start justify-between gap-3 space-y-0 pb-3\">\n",
    "          <div className=\"space-y-1\">\n",
    "            <CardTitle className=\"font-heading text-base font-semibold\">{title}</CardTitle>\n",
    "            {description ? <CardDescription className=\"text-xs leading-relaxed\">{description}</CardDescription> : null}\n",
    "          </div>\n",
    "          {action}\n",
    "        </CardHeader>\n",
    "      ) : null}\n",
    "      <CardContent className={cn(title ? 'pt-0' : 'pt-5', contentClassName)}>{children}</CardContent>\n",
    "    </Card>\n",
    "  );\n",
    "}"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "36f186be",
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
