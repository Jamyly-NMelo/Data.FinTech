# Data.FinTech

Aplicação React + Vite para controle financeiro. O frontend chama o Web App do
Google Apps Script, que valida a sessão e lê/grava os dados no Google Sheets:

```text
React → Google Apps Script → Google Sheets
```

As definições originais das entidades e campos estão preservadas em
`docs/schema/`.

## Configuração local

Requisitos: Node.js e npm.

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env.local` e informe a URL do Web App:

   ```dotenv
   VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/SEU_DEPLOYMENT_ID/exec
   ```

   `.env.local` é ignorado pelo Git. Não coloque tokens, senhas ou URLs de
   implantação reais em arquivos versionados.

3. Inicie o frontend:

   ```bash
   npm run dev
   ```

   O Vite mostra a URL local no terminal. A API precisa estar implantada e
   acessível para que login e dados funcionem.

## Implantar o Apps Script

O backend é implantado separadamente no projeto Apps Script associado à
planilha. O código-fonte está em `apps-script/Codigo.gs` e implementa as ações
`auth.*` e `records.*` usadas pelo frontend.

1. Configure as propriedades e permissões exigidas pelo código do script.
2. Publique como **Web app**, usando a identidade e o acesso apropriados para
   sua aplicação.
3. Copie a URL de implantação terminada em `/exec` para `VITE_APPS_SCRIPT_URL`
   no ambiente de execução do frontend.
4. Ao publicar uma nova versão do script, atualize a implantação do Web App.

Não publique credenciais ou tokens no frontend. A autenticação da aplicação
usa o `access_token` retornado pelo fluxo de login.

## Verificações

```bash
npm run lint
npm run build
node --test src/lib/finance/tests/*.test.js
```

O `package.json` ainda não define um script `npm test`; os testes existentes são
executados diretamente pelo runner do Node.js.
