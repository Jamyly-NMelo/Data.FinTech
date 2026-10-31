{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "49db5225",
   "metadata": {},
   "outputs": [],
   "source": [
    "import { createClient } from '@base44/sdk';\n",
    "import { appParams } from '@/lib/app-params';\n",
    "\n",
    "const { appId, token, functionsVersion, appBaseUrl } = appParams;\n",
    "\n",
    "export const base44 = createClient({\n",
    "  appId,\n",
    "  token,\n",
    "  functionsVersion,\n",
    "  serverUrl: '',\n",
    "  appBaseUrl\n",
    "});"
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
