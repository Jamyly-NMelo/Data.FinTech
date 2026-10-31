{
 "cells": [
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "5415d904",
   "metadata": {},
   "outputs": [],
   "source": [
    "import React from 'react'\n",
    "import ReactDOM from 'react-dom/client'\n",
    "import App from '@/App.jsx'\n",
    "import '@/index.css'\n",
    "import { registerServiceWorker } from '@/lib/pwa'\n",
    "\n",
    "ReactDOM.createRoot(document.getElementById('root')).render(\n",
    "  <App />\n",
    ")\n",
    "\n",
    "registerServiceWorker()"
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
