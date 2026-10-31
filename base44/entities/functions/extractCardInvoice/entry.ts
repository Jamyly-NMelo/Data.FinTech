import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

/**
 * Leitura de fatura de cartão em PDF.
 *
 * Entrada: { file_uri } — identificador de arquivo PRIVADO (nunca uma URL pública).
 * Saída:   { source, document, warnings } — dados brutos lidos do documento.
 *
 * Nada é gravado aqui: a extração só devolve o conteúdo para a tela de
 * conferência. O arquivo é acessado por URL assinada e de curta duração.
 */

const INVOICE_SCHEMA = {
  type: 'object',
  properties: {
    institution: { type: 'string', description: 'Nome do banco ou emissor do cartão' },
    card_mask: { type: 'string', description: 'Identificação mascarada do cartão, por exemplo **** 1234' },
    closing_date: { type: 'string', description: 'Data de fechamento no formato AAAA-MM-DD' },
    due_date: { type: 'string', description: 'Data de vencimento no formato AAAA-MM-DD' },
    period_from: { type: 'string', description: 'Início do período da fatura em AAAA-MM-DD' },
    period_to: { type: 'string', description: 'Fim do período da fatura em AAAA-MM-DD' },
    previous_balance: { type: 'number', description: 'Saldo anterior da fatura' },
    declared_total: { type: 'number', description: 'Valor total da fatura informado no documento' },
    minimum_payment: { type: 'number', description: 'Pagamento mínimo informado, quando existir' },
    document_kind: {
      type: 'string',
      enum: ['detalhada', 'resumo', 'ilegivel'],
      description: 'detalhada quando há lançamentos; resumo quando só há totais; ilegivel quando não foi possível ler',
    },
    items: {
      type: 'array',
      description: 'Lançamentos discriminados no documento, no máximo 200',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          date: { type: 'string', description: 'Data do lançamento em AAAA-MM-DD' },
          amount: { type: 'number', description: 'Valor do lançamento (positivo para compras e encargos)' },
          type: {
            type: 'string',
            enum: ['compra', 'encargo', 'credito', 'pagamento'],
            description: 'compra, encargo (juros, IOF, anuidade, tarifa), credito (estorno/reembolso) ou pagamento',
          },
          installment_current: { type: 'number' },
          installment_total: { type: 'number' },
        },
        required: ['description', 'amount'],
      },
    },
  },
  required: ['items'],
};

const INSTRUCTIONS = [
  'Você lê faturas de cartão de crédito brasileiras em PDF e devolve apenas o que está escrito no documento.',
  'Regras obrigatórias:',
  '1. Nunca invente datas, valores, parcelas, juros ou saldos. Se um campo não estiver legível, use null.',
  '2. Datas sempre no formato AAAA-MM-DD. Valores sempre numéricos, com ponto decimal.',
  '3. Transcreva cada lançamento da fatura em items, na ordem do documento, no máximo 200 itens.',
  '4. Classifique cada lançamento em compra, encargo (juros, IOF, anuidade, tarifa, multa), credito (estorno, reembolso, devolução) ou pagamento.',
  '5. Quando houver parcelamento, informe installment_current e installment_total; caso contrário, use null.',
  '6. O total da fatura vai em declared_total apenas se estiver impresso no documento.',
  '7. Se o PDF estiver protegido, borrado ou sem texto de fatura, retorne items vazio e document_kind "ilegivel".',
  '8. Se o documento trouxer somente o resumo (sem compras discriminadas), retorne items vazio e document_kind "resumo".',
  '9. Não inclua número completo do cartão, senha ou qualquer credencial.',
].join('\n');

const hasContent = (document) => {
  if (!document || typeof document !== 'object') return false;
  const items = Array.isArray(document.items) ? document.items : [];
  const total = Number(document.declared_total);
  return items.length > 0 || (Number.isFinite(total) && total > 0) || Boolean(document.due_date);
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => (error.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileUri = typeof body?.file_uri === 'string' ? body.file_uri.trim() : '';
    if (!fileUri) return Response.json({ error: 'Informe o arquivo da fatura.' }, { status: 400 });
    if (fileUri.length > 600) return Response.json({ error: 'Identificador de arquivo inválido.' }, { status: 400 });
    if (/^https?:\/\//i.test(fileUri)) {
      return Response.json({ error: 'Envie o identificador do arquivo privado, não um endereço público.' }, { status: 400 });
    }

    let signedUrl = null;
    try {
      const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 300 });
      signedUrl = signed?.signed_url || null;
    } catch (signError) {
      return Response.json({ error: 'Arquivo não encontrado ou sem permissão de leitura.' }, { status: 400 });
    }
    if (!signedUrl) return Response.json({ error: 'Não foi possível acessar o arquivo enviado.' }, { status: 400 });

    const warnings = [];
    let document = null;
    let source = null;

    try {
      const extracted = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
        file_url: signedUrl,
        json_schema: INVOICE_SCHEMA,
      });
      if (extracted?.status === 'success' && extracted.output) {
        document = Array.isArray(extracted.output) ? extracted.output[0] : extracted.output;
        source = 'extract_data';
      } else {
        warnings.push('A leitura estruturada não retornou dados utilizáveis' + (extracted?.details ? ': ' + extracted.details : '.'));
      }
    } catch (error) {
      warnings.push('Leitura estruturada indisponível: ' + error.message);
    }

    if (!hasContent(document)) {
      const fallback = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: INSTRUCTIONS,
        file_urls: [signedUrl],
        response_json_schema: INVOICE_SCHEMA,
      });
      if (fallback && typeof fallback === 'object' && hasContent(fallback)) {
        document = fallback;
        source = source ? 'extract_data+llm' : 'llm';
      }
    }

    if (!hasContent(document)) {
      return Response.json(
        {
          error: 'Não foi possível ler esta fatura. O arquivo pode estar protegido, ilegível ou não ser uma fatura de cartão.',
          warnings,
        },
        { status: 422 },
      );
    }

    return Response.json({ source, document, warnings });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}