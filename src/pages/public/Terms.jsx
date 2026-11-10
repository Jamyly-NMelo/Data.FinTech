import React from 'react';
import InfoPage, { InfoSection } from '@/components/public/InfoPage';
import { SITE_CONFIG } from '@/config/site';

export default function Terms() {
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL;

  return (
    <InfoPage
      title="Termos de Uso"
      description={`Condições para usar ${SITE_CONFIG.name} e as responsabilidades de cada parte.`}
      path="/termos"
      updatedAt="5 de novembro de 2026"
    >
      <InfoSection heading={`1. O que é ${SITE_CONFIG.name}`}>
        <p>
          Uma ferramenta de organização e acompanhamento financeiro (lançamentos, fluxo de caixa, indicadores,
          precificação e relatórios). Os cálculos são baseados nas informações que você mesmo informa.
        </p>
      </InfoSection>

      <InfoSection heading="2. Não é aconselhamento">
        <p>
          O aplicativo e os conteúdos educativos têm caráter informativo. Não constituem consultoria financeira,
          contábil, jurídica, tributária ou de investimentos, nem recomendação de compra ou venda de ativos. Decisões
          financeiras são de sua responsabilidade; busque um profissional habilitado quando necessário. Exemplos nos
          conteúdos são hipotéticos.
        </p>
      </InfoSection>

      <InfoSection heading="3. Conta e acesso">
        <ul className="list-disc space-y-2 pl-5">
          <li>Você deve fornecer informações verdadeiras e manter sua senha em sigilo.</li>
          <li>Você é responsável pelas atividades realizadas na sua conta.</li>
          <li>O uso é pessoal. É proibido compartilhar o acesso de forma que viole a segurança do serviço.</li>
          <li>O cadastro pode estar limitado ou fechado a critério do responsável pelo aplicativo.</li>
        </ul>
      </InfoSection>

      <InfoSection heading="4. Uso permitido">
        <p>
          É proibido: tentar acessar dados de outros usuários; testar ou explorar falhas de segurança; automatizar
          acessos de forma abusiva; enviar conteúdo ilegal ou malicioso; usar o aplicativo para fraude, lavagem de
          dinheiro ou qualquer atividade ilícita.
        </p>
      </InfoSection>

      <InfoSection heading="5. Seus dados">
        <p>
          Os dados que você registra continuam sendo seus. Você nos autoriza a armazená-los e processá-los apenas para
          operar o aplicativo, conforme a{' '}
          <a href="/privacidade" className="font-medium text-primary underline-offset-4 hover:underline">
            Política de Privacidade
          </a>
          . Recomendamos manter seus próprios backups e conferir os valores importantes.
        </p>
      </InfoSection>

      <InfoSection heading="6. Disponibilidade e limites">
        <p>
          O serviço é oferecido "como está", sem garantia de funcionamento ininterrupto ou livre de erros. Ele depende
          da infraestrutura do Google e está sujeito às cotas e limites dela. Podemos alterar, suspender ou encerrar
          funcionalidades. Na máxima extensão permitida em lei, não nos responsabilizamos por perdas decorrentes de
          decisões tomadas com base nos dados ou cálculos do aplicativo, nem por indisponibilidades fora do nosso
          controle.
        </p>
      </InfoSection>

      <InfoSection heading="7. Propriedade intelectual">
        <p>
          O aplicativo, sua marca e seu conteúdo editorial pertencem ao responsável por {SITE_CONFIG.name}. Você recebe uma
          licença limitada, pessoal e revogável de uso. É proibido copiar ou redistribuir o conteúdo sem autorização.
        </p>
      </InfoSection>

      <InfoSection heading="8. Publicidade">
        <p>
          Páginas públicas de conteúdo educativo podem exibir anúncios de terceiros (Google AdSense). Não nos
          responsabilizamos pelo conteúdo dos anúncios nem por sites de terceiros.
        </p>
      </InfoSection>

      <InfoSection heading="9. Encerramento">
        <p>Você pode solicitar a exclusão da sua conta a qualquer momento. Podemos suspender contas que violem estes termos.</p>
      </InfoSection>

      <InfoSection heading="10. Alterações">
        <p>
          Estes termos podem ser atualizados. O uso continuado após a atualização indica concordância com a versão
          vigente.
        </p>
      </InfoSection>

      <InfoSection heading="11. Lei aplicável">
        <p>Estes termos são regidos pelas leis do Brasil.</p>
      </InfoSection>

      <InfoSection heading="12. Contato">
        <p>
          {contactEmail ? (
            <>
              Para esclarecer dúvidas, escreva para{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {contactEmail}
              </a>
              .
            </>
          ) : (
            <>
              Para esclarecer dúvidas, use o{' '}
              <a href="/contato" className="font-medium text-primary underline-offset-4 hover:underline">
                formulário de contato do aplicativo
              </a>
              .
            </>
          )}
        </p>
      </InfoSection>
    </InfoPage>
  );
}