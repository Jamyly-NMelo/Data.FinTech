import React from 'react';
import InfoPage, { InfoSection } from '@/components/public/InfoPage';

export default function Privacy() {
  return (
    <InfoPage
      title="Política de Privacidade"
      description="Como o Data Fin trata os dados que você registra, quais informações ficam no seu navegador e como funcionam os anúncios nas páginas de conteúdo."
      path="/privacidade"
      updatedAt="28/10/2026"
    >
      <InfoSection heading="1. Quais dados são tratados">
        <p>
          <strong>Dados de acesso:</strong> nome e e-mail informados no cadastro, usados para autenticação e para
          identificar os registros de cada pessoa.
        </p>
        <p>
          <strong>Dados financeiros que você registra:</strong> contas, lançamentos, categorias, orçamentos, metas,
          dívidas, investimentos e operações. Esses dados são inseridos por você e existem apenas para gerar os
          indicadores exibidos no próprio aplicativo.
        </p>
        <p>
          <strong>Mensagens enviadas pelo formulário de contato:</strong> nome, e-mail e o texto da mensagem.
        </p>
      </InfoSection>

      <InfoSection heading="2. Onde os dados ficam armazenados">
        <p>
          Os registros financeiros e as mensagens de contato ficam armazenados na infraestrutura do provedor da
          plataforma que hospeda o aplicativo, com regras de acesso por registro: cada usuário autenticado acessa
          somente os próprios dados. Administradores do aplicativo podem visualizar mensagens de contato para responder
          a elas.
        </p>
        <p>
          Preferências de interface — tema claro ou escuro, ambiente ativo, modo privacidade e período de projeção —
          ficam gravadas apenas no armazenamento local do seu navegador (localStorage) e não são enviadas para o
          servidor.
        </p>
        <p>
          O aplicativo funciona como PWA e mantém uma cópia em cache de arquivos estáticos e páginas para uso offline.
          Você pode limpar esse cache a qualquer momento pelas configurações do navegador.
        </p>
      </InfoSection>

      <InfoSection heading="3. Cookies e tecnologias de publicidade">
        <p>
          As páginas de conteúdo (artigos) podem exibir anúncios do Google AdSense. Nesses casos, o Google e seus
          parceiros podem utilizar cookies e identificadores para exibir anúncios com base nas visitas a este e a outros
          sites.
        </p>
        <p>
          Você pode desativar a publicidade personalizada nas{' '}
          <a
            href="https://www.google.com/settings/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Configurações de anúncios do Google
          </a>{' '}
          e consultar como o Google utiliza cookies em{' '}
          <a
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            policies.google.com/technologies/ads
          </a>
          . O bloqueio de cookies pode ser feito nas configurações do seu navegador.
        </p>
        <p>
          O script de publicidade é carregado somente nas páginas de artigos publicados. Ele não é carregado na área
          logada do aplicativo — painel, lançamentos, contas, orçamento, metas, dívidas, investimentos, relatórios,
          simuladores, backup, configurações e telas de acesso.
        </p>
      </InfoSection>

      <InfoSection heading="4. Compartilhamento">
        <p>
          Não vendemos dados pessoais. O compartilhamento ocorre apenas com o provedor de infraestrutura que hospeda o
          aplicativo, necessário para o seu funcionamento, e com o Google, na condição de fornecedor de publicidade nas
          páginas de conteúdo, conforme descrito acima.
        </p>
      </InfoSection>

      <InfoSection heading="5. Seus direitos">
        <p>
          Você pode consultar e corrigir os seus dados dentro do próprio aplicativo, além de exportar a sua base
          completa em arquivo JSON pela tela de backup. Para solicitar a exclusão da conta e dos registros associados,
          ou esclarecer dúvidas sobre este documento, use a{' '}
          <a href="/contato" className="font-medium text-primary underline-offset-4 hover:underline">
            página de contato
          </a>
          .
        </p>
      </InfoSection>

      <InfoSection heading="6. Segurança e retenção">
        <p>
          O acesso à área logada exige autenticação, e as consultas de dados são limitadas ao usuário autenticado. Os
          dados são mantidos enquanto a conta existir, para que o histórico financeiro permaneça disponível ao titular.
        </p>
      </InfoSection>

      <InfoSection heading="7. Alterações nesta política">
        <p>
          Se este documento mudar, a data de atualização no topo da página será alterada. Recomendamos consultá-la
          periodicamente.
        </p>
      </InfoSection>
    </InfoPage>
  );
}