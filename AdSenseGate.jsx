{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "51a84a9a",
   "metadata": {},
   "outputs": [],
   "source": [
    "import { useEffect } from 'react';\n",
    "import { useLocation } from 'react-router-dom';\n",
    "import { isAdEligiblePath, loadAdSenseScript } from '@/lib/adsense';\n",
    "\n",
    "/**\n",
    " * Carrega o script do Google AdSense apenas quando a rota atual é uma página\n",
    " * editorial publicada. Em qualquer outra tela nada é carregado.\n",
    " * Deve ser montado somente dentro de páginas de artigo.\n",
    " */\n",
    "export default function AdSenseGate() {\n",
    "  const { pathname } = useLocation();\n",
    "\n",
    "  useEffect(() => {\n",
    "    if (!isAdEligiblePath(pathname)) return;\n",
    "    loadAdSenseScript();\n",
    "  }, [pathname]);\n",
    "\n",
    "  return null;\n",
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
