import React from 'react';
import InfoPage, { InfoSection } from '@/components/public/InfoPage';
import { SITE_CONFIG } from '@/config/site';

export default function About() {
  return (
    <InfoPage
      title={`Sobre ${SITE_CONFIG.name}`}
      description={`${SITE_CONFIG.name} é um aplicativo de gestão financeira para acompanhar, no mesmo lugar, as finanças pessoais, as do negócio e os investimentos.`}
      path="/sobre"
    >
      <InfoSection heading="O que o aplicativo faz">
        <p>
          {SITE_CONFIG.name} reúne contas, lançamentos, orçamento, metas, dívidas, investimentos e indicadores em quatro
          ambientes: Pessoas Físicas (PF), Empresarial (PJ), Investimentos e Visão Consolidada. Cada ambiente mostra
          apenas as ferramentas que fazem sentido para ele.
        </p>
        <p>
          Os números da interface são calculados a partir dos lançamentos registrados pelo próprio usuário. Saldos
          consideram apenas movimentos liquidados; transferências entre contas próprias não alteram receitas nem
          despesas; e o resultado do mês vem da diferença entre receitas e despesas de fato.
        </p>
      </InfoSection>

      <InfoSection heading="Como os seus dados são tratados">
        <p>
          Os dados ficam vinculados à sua conta no aplicativo e cada pessoa acessa somente os próprios registros. As
          preferências de exibição, como tema e ambiente ativo, ficam apenas no seu navegador.
        </p>
        <p>
          Você pode exportar e restaurar a sua base em arquivo JSON pela tela de backup. O detalhamento completo está na{' '}
          <a href="/privacidade" className="font-medium text-primary underline-offset-4 hover:underline">
            Política de Privacidade
          </a>
          .
        </p>
      </InfoSection>

      <InfoSection heading="Por que publicamos conteúdos">
        <p>
          A maior parte das dúvidas de finanças pessoais e de pequenos negócios se resolve com uma conta bem feita:
          custo variável, margem de contribuição, ponto de equilíbrio, custo de vida, reserva. Publicamos textos que
          mostram esse cálculo passo a passo, com exemplos hipotéticos claramente identificados.
        </p>
        <p>
          O material é educativo. Não é recomendação de investimento, consultoria financeira, contábil ou tributária, e
          não substitui a análise do seu caso concreto.
        </p>
      </InfoSection>

      <InfoSection heading="Fale com a gente">
        <p>
          Sugestões de temas, correções de conteúdo e dúvidas sobre o aplicativo podem ser enviadas pela{' '}
          <a href="/contato" className="font-medium text-primary underline-offset-4 hover:underline">
            página de contato
          </a>
          .
        </p>
      </InfoSection>
    </InfoPage>
  );
}