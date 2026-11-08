# Data.FinTech

Aplicação web React com API em Google Apps Script e persistência no Google Sheets.

## Arquitetura

```text
React -> Google Apps Script -> Google Sheets
```

O frontend usa as ações `auth.*` e `records.*` do Web App. O Apps Script autentica e autoriza cada operação antes de acessar as planilhas.

## Desenvolvimento local

Requisitos: Node.js compatível com Vite e npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure `VITE_APPS_SCRIPT_URL` com a URL `/exec` do Web App implantado e `VITE_GOOGLE_CLIENT_ID` com o ID OAuth Web usado no login Google. `.env.local` é local e não deve ser commitado.

Comandos de verificação:

```bash
npm run lint
npm run build
node --test src/lib/finance/tests/*.test.js
```

## Login Google

O frontend usa Google Identity Services e envia a credencial ao Apps Script pela ação `auth.googleLogin`. Configure o mesmo ID do cliente OAuth Web no frontend (`VITE_GOOGLE_CLIENT_ID`) e nas Script Properties (`GOOGLE_CLIENT_ID`).

No Google Cloud Console:

1. Configure a tela de consentimento OAuth.
2. Crie ou selecione um cliente OAuth do tipo **Aplicativo da Web**.
3. Em **Origens JavaScript autorizadas**, cadastre cada origem usada, incluindo a origem local exibida pelo servidor Vite e a origem HTTPS de produção. Informe apenas esquema, domínio e porta, sem caminho.
4. Use o ID do cliente nas configurações do frontend e do Apps Script.

## Configurar as propriedades do Apps Script

No projeto Apps Script, abra **Configurações do projeto > Propriedades do script** e configure:

- `GOOGLE_CLIENT_ID`: ID do cliente OAuth Web.
- `ALLOW_REGISTRATION`: `true` para permitir cadastro ou `false` para desativá-lo.
- `APP_URL`: origem pública da aplicação usada nos retornos de autenticação.
- `ADMIN_EMAIL` e `ADMIN_SENHA`: use somente durante a execução manual de `criarAdmin` para provisionar a conta administrativa. Remova ou limpe essas propriedades após a criação.

Nunca coloque senhas, tokens ou segredos em variáveis `VITE_*`, no código do navegador ou no repositório. As variáveis `VITE_*` são incluídas no bundle público.

## Implantar o Apps Script

O backend está em `apps-script/Codigo.gs`.

1. Abra ou sincronize esse arquivo no projeto Apps Script vinculado à planilha e autorize o acesso solicitado ao Google Sheets.
2. Crie uma implantação do tipo **App da Web**.
3. Defina **Executar como**: **Eu**.
4. Defina **Quem pode acessar**: **Qualquer pessoa**. O acesso às operações continua sujeito à autenticação e autorização implementadas pelo backend.
5. Ao publicar alterações futuras, edite a implantação existente e selecione uma nova versão. Mantenha a mesma implantação e a mesma URL `/exec` para evitar reconfigurar o frontend.
6. Configure essa URL como `VITE_APPS_SCRIPT_URL` no ambiente local e no ambiente de hospedagem do frontend.

Não publique chaves, senhas, tokens de sessão ou URLs reais de implantação em documentação ou commits. Use `.env.example` apenas como modelo com placeholders.
