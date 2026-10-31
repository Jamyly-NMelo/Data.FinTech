{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "812a5c93",
   "metadata": {},
   "outputs": [],
   "source": [
    "import base44 from \"@base44/vite-plugin\"\n",
    "import react from '@vitejs/plugin-react'\n",
    "import { defineConfig } from 'vite'\n",
    "\n",
    "// https://vite.dev/config/\n",
    "export default defineConfig({\n",
    "  plugins: [\n",
    "    base44({\n",
    "      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.\n",
    "      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk\n",
    "      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',\n",
    "      hmrNotifier: true,\n",
    "      navigationNotifier: true,\n",
    "      analyticsTracker: true,\n",
    "      visualEditAgent: true\n",
    "    }),\n",
    "    react(),\n",
    "  ]\n",
    "});\n"
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
