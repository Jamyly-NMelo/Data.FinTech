import React from 'react';
import InfoPage, { InfoSection } from '@/components/public/InfoPage';
import { SITE_CONFIG } from '@/config/site';

export default function Privacy() {
  const contactEmail = import.meta.env.VITE_CONTACT_EMAIL;

  return (
    <InfoPage
      title="Política de Privacidade"
      description={`Saiba quais dados ${SITE_CONFIG.name} trata, para que são usados e quais são os seus direitos.`}
      path="/privacidade"
      updatedAt="5 de novembro de 2026"
    >
      <InfoSection heading="1. Quais dados coletamos">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Dados de conta: nome, e-mail e senha. A senha é guardada apenas de forma protegida (hash com sal), nunca em
            texto legível.
          </li>
          <li>
            Login com Google (opcional): ao entrar com o Google, recebemos seu nome e e-mail verificados. Não recebemos
            sua senha do Google nem acesso a outros serviços da sua conta Google.
          </li>
          <li>
            Dados financeiros que você mesmo registra: lançamentos, contas, categorias, produtos, preços, metas e
            configurações dos ambientes Pessoal, Empresarial, Investimentos e Consolidado.
          </li>
          <li>Mensagens de contato que você enviar.</li>
          <li>
            Dados técnicos de sessão: um token de acesso guardado no armazenamento do seu navegador para manter você
            conectado, e registros mínimos de tentativas de login usados para segurança.
          </li>
        </ul>
        <p>
          Não solicitamos dados bancários de acesso (senhas de banco, números de cartão ou de conta). Não registre essas
          informações em campos de texto livre.
        </p>
      </InfoSection>

      <InfoSection heading="2. Para que usamos os dados">
        <ul className="list-disc space-y-2 pl-5">
          <li>Criar e autenticar sua conta, inclusive enviando códigos de verificação e de redefinição de senha por e-mail.</li>
          <li>Armazenar e exibir seus dados financeiros e calcular os indicadores do aplicativo.</li>
          <li>Proteger a conta e prevenir abusos (limite de tentativas de login).</li>
          <li>Responder mensagens de contato.</li>
          <li>Manter e melhorar o aplicativo.</li>
        </ul>
        <p>Não vendemos seus dados.</p>
      </InfoSection>

      <InfoSection heading="3. Onde os dados ficam e quem os processa">
        <p>
          Os dados são armazenados em planilhas do Google Sheets e processados por um serviço do Google Apps Script,
          ambos operados pelo responsável pelo aplicativo na infraestrutura do Google. O Google atua como operador dessa
          infraestrutura, conforme seus próprios termos e política de privacidade. Os dados de cada usuário são
          separados: cada conta só acessa os registros que criou.
        </p>
      </InfoSection>

      <InfoSection heading="4. Cookies, armazenamento local e publicidade">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            O aplicativo usa o armazenamento local do navegador para manter a sessão e guardar preferências (como tema e
            ambiente ativo). Esses itens são necessários ao funcionamento.
          </li>
          <li>
            Páginas públicas de conteúdo educativo podem exibir anúncios do Google AdSense. O Google e seus parceiros
            podem usar cookies para exibir anúncios com base em visitas anteriores a este e a outros sites. Você pode
            gerenciar a personalização de anúncios em{' '}
            <a
              href="https://adssettings.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              adssettings.google.com
            </a>{' '}
            e saber mais em{' '}
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              policies.google.com/technologies/ads
            </a>
            .
          </li>
          <li>
            Não exibimos anúncios em telas privadas, de login, de cadastro, de configurações ou onde você registra dados
            financeiros.
          </li>
          <li>
            Você pode bloquear ou apagar cookies nas configurações do navegador. Isso pode afetar partes do funcionamento.
          </li>
        </ul>
      </InfoSection>

      <InfoSection heading="5. Compartilhamento">
        <p>
          Compartilhamos dados apenas com: (a) o Google, como provedor da infraestrutura, do login e dos anúncios
          descritos acima; (b) autoridades, quando exigido por lei. Não compartilhamos seus dados financeiros com
          terceiros para fins comerciais.
        </p>
      </InfoSection>

      <InfoSection heading="6. Por quanto tempo guardamos">
        <p>
          Mantemos os dados enquanto sua conta existir. Ao solicitar a exclusão da conta, apagamos seus dados do
          aplicativo, ressalvados registros que a lei exija manter e cópias de segurança que sejam sobrescritas no ciclo
          normal de backup.
        </p>
      </InfoSection>

      <InfoSection heading="7. Seus direitos (LGPD)">
        <p>
          Você pode solicitar: confirmação de que tratamos seus dados, acesso, correção, portabilidade, eliminação,
          informação sobre compartilhamento e revogação de consentimento, nos termos da Lei nº 13.709/2018 (LGPD). Para
          exercer esses direitos, use a seção Contato.
        </p>
      </InfoSection>

      <InfoSection heading="8. Segurança">
        <p>
          Adotamos medidas razoáveis: senhas com hash e sal, tokens de sessão armazenados de forma protegida no servidor,
          isolamento de dados por usuário e limitação de tentativas de login. Nenhum sistema é totalmente invulnerável;
          proteja sua senha e saia de contas em dispositivos compartilhados.
        </p>
      </InfoSection>

      <InfoSection heading="9. Crianças e adolescentes">
        <p>O aplicativo não é destinado a menores de 18 anos.</p>
      </InfoSection>

      <InfoSection heading="10. Alterações desta política">
        <p>Podemos atualizar esta política. A data de atualização no topo indica a versão vigente.</p>
      </InfoSection>

      <InfoSection heading="11. Contato">
        <p>
          {contactEmail ? (
            <>
              Para exercer seus direitos ou esclarecer dúvidas, escreva para{' '}
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
              Para exercer seus direitos ou esclarecer dúvidas, use o{' '}
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
