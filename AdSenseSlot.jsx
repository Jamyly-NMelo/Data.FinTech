{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "54449f63",
   "metadata": {},
   "outputs": [],
   "source": [
    "import React, { useEffect } from 'react';\n",
    "import { useLocation } from 'react-router-dom';\n",
    "import { ADSENSE_CLIENT_ID, ADSENSE_SLOT, isAdEligiblePath, loadAdSenseScript } from '@/lib/adsense';\n",
    "\n",
    "/**\n",
    " * Bloco de anúncio individual. Só renderiza em artigo publicado e apenas quando\n",
    " * existir um identificador de bloco real em ADSENSE_SLOT (hoje nulo, para não\n",
    " * inventar identificadores). Sem essas condições não gera nenhum espaço vazio.\n",
    " */\n",
    "export default function AdSenseSlot({ slot = ADSENSE_SLOT, className }) {\n",
    "  const { pathname } = useLocation();\n",
    "  const eligible = Boolean(slot) && isAdEligiblePath(pathname);\n",
    "\n",
    "  useEffect(() => {\n",
    "    if (!eligible) return;\n",
    "    let cancelled = false;\n",
    "    loadAdSenseScript().then((ready) => {\n",
    "      if (!ready || cancelled) return;\n",
    "      try {\n",
    "        (window.adsbygoogle = window.adsbygoogle || []).push({});\n",
    "      } catch (error) {\n",
    "        /* o bloco simplesmente não é preenchido; nenhum layout é afetado */\n",
    "      }\n",
    "    });\n",
    "    return () => {\n",
    "      cancelled = true;\n",
    "    };\n",
    "  }, [eligible, slot]);\n",
    "\n",
    "  if (!eligible) return null;\n",
    "\n",
    "  return (\n",
    "    <div className={className}>\n",
    "      <ins\n",
    "        className=\"adsbygoogle\"\n",
    "        style={{ display: 'block' }}\n",
    "        data-ad-client={ADSENSE_CLIENT_ID}\n",
    "        data-ad-slot={slot}\n",
    "        data-ad-format=\"auto\"\n",
    "        data-full-width-responsive=\"true\"\n",
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
