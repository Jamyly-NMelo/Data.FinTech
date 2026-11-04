# Instruções do projeto

## Arquitetura

Este repositório contém o frontend React + Vite. A aplicação chama o Web App
Google Apps Script, que valida autenticação e usa o Google Sheets como banco:

```text
React → Apps Script → Google Sheets
```

O cliente da API fica em `src/Client.js` e é reexportado por
`src/services/api.js`. Preserve o protocolo existente: leituras via GET,
escritas via POST com JSON e autenticação por `access_token`.

## Ambiente e execução

- Configure `VITE_APPS_SCRIPT_URL` em `.env.local`; nunca versione URLs de
  implantação reais, tokens ou senhas.
- Rode `npm install` e `npm run dev` para desenvolvimento local.
- Rode `npm run lint` e `npm run build` para validar alterações.
- O backend é implantado separadamente como Web App do Google Apps Script.
  Consulte `README.md` para o fluxo de implantação.

## Convenções

- Mantenha componentes em `src/components/`, páginas em `src/pages/` e lógica
  compartilhada em `src/lib/`.
- Consulte `docs/schema/` para os nomes de entidades e campos.
- Reutilize `src/services/api.js` para chamadas ao backend.
- Faça mudanças focadas e preserve os nomes de entidades e campos esperados pela
  API e pelas abas do Google Sheets.
