import React from 'react';
import InfoPage, { InfoSection } from '@/components/public/InfoPage';

export default function Terms() {
  return (
    <InfoPage
      title="Termos de Uso"
      description="Condições para usar o Data Fin, os limites do conteúdo educativo publicado e as responsabilidades de cada parte."
      path="/termos"
      updatedAt="28/10/2026"
    >
      <InfoSection heading="1. Objeto">
        <p>
          O Data Fin é um aplicativo de organização financeira que permite registrar contas, lançamentos, orçamentos,
          metas, dívidas e investimentos, e acompanhar indicadores calculados a partir desses registros. O uso é pessoal
          e intransferível.
        </p>
      </InfoSection>

      <InfoSection heading="2. Conta e responsabilidade pelos dados">
        <p>
          Você é responsável pelas informações que registra e por manter suas credenciais de acesso em segurança. Os
          indicadores exibidos dependem da qualidade e da atualização dos lançamentos inseridos.
        </p>
      </InfoSection>

      <InfoSection heading="3. Conteúdo educativo">
        <p>
          Os artigos publicados na área de conteúdos são material educativo. Não constituem recomendação de
          investimento, consultoria financeira, contábil, tributária ou jurídica, e não substituem a análise de um
          profissional para o seu caso concreto. Os exemplos numéricos são hipotéticos.
        </p>
      </InfoSection>

      <InfoSection heading="4. Uso permitido">
        <p>
          É proibido utilizar o aplicativo para atividades ilícitas, tentar acessar dados de outras pessoas, interferir
          no funcionamento do serviço ou automatizar acessos de forma abusiva.
        </p>
      </InfoSection>

      <InfoSection heading="5. Disponibilidade">
        <p>
          O serviço é oferecido no estado em que se encontra. Podem ocorrer interrupções para manutenção, atualizações ou
          por falhas de terceiros. Recomendamos manter backup periódico da sua base pela tela de backup.
        </p>
      </InfoSection>

      <InfoSection heading="6. Propriedade dos seus dados">
        <p>
          Os dados financeiros que você registra continuam sendo seus e podem ser exportados em arquivo JSON a qualquer
          momento.
        </p>
      </InfoSection>

      <InfoSection heading="7. Privacidade">
        <p>
          O tratamento de dados pessoais está descrito na{' '}
          <a href="/privacidade" className="font-medium text-primary underline-offset-4 hover:underline">
            Política de Privacidade
          </a>
          , que faz parte destes termos.
        </p>
      </InfoSection>

      <InfoSection heading="8. Alterações">
        <p>
          Estes termos podem ser atualizados. A versão vigente é sempre a publicada nesta página, com a data de
          atualização indicada no topo.
        </p>
      </InfoSection>

      <InfoSection heading="9. Legislação aplicável">
        <p>
          Estes termos são regidos pela legislação brasileira. Dúvidas podem ser encaminhadas pela{' '}
          <a href="/contato" className="font-medium text-primary underline-offset-4 hover:underline">
            página de contato
          </a>
          .
        </p>
      </InfoSection>
    </InfoPage>
  );
}