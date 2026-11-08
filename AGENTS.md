# Instruções do projeto

## Arquitetura e segurança

- O backend ativo é `apps-script/Codigo.gs`, com dados no Google Sheets. Preserve o contrato `auth.*` e `records.*` usado pelo frontend.
- O Apps Script autentica e autoriza cada operação. Não confie em identidade, proprietário ou papel enviados pelo navegador; valide entidade, referências e permissões no backend.
- O login Google usa Google Identity Services no frontend e a ação `auth.googleLogin` no Apps Script.
- Configure o ID público do OAuth Web em `VITE_GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_ID`. Não coloque segredos em variáveis `VITE_*`, pois elas são expostas no bundle.
- Nunca versione `.env.local`, credenciais, tokens, senhas ou URLs reais de implantação. Mantenha `.env.example` com placeholders.
- `ADMIN_EMAIL` e `ADMIN_SENHA` são propriedades temporárias, usadas somente para executar `criarAdmin`; remova-as após provisionar a conta.
- Não habilite upload de faturas ou links públicos de arquivos sem armazenamento privado e autenticado. Backups locais permanecem limitados a 10 MiB.

## Ambiente e execução

- `npm install` instala dependências.
- `npm run dev` inicia o frontend Vite.
- `npm run lint` executa o ESLint.
- `npm run build` compila a aplicação para produção.
- `node --test src/lib/finance/tests/*.test.js` executa os testes da lógica financeira.
- O Apps Script é implantado separadamente; siga `README.md` para configuração do Web App, das propriedades do script e do OAuth.

## Convenções

- Mantenha componentes em `src/components/`, páginas em `src/pages/` e lógica compartilhada em `src/lib/`.
- Consulte `docs/schema/` para nomes de entidades e campos esperados pela API e planilha.
- Reutilize `src/services/api.js` para chamadas ao backend.
- Preserve os componentes Radix existentes em `src/components/ui/`.
- Não altere `src/Client.js` nem o protocolo `auth.*`/`records.*` sem necessidade comprovada e autorização.
- Faça mudanças focadas, atualize a documentação relacionada e valide com os comandos do projeto.
