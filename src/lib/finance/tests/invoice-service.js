/** Envio e leitura da fatura em PDF (arquivo privado, sem URL pública permanente). */

import { base44 } from '@/api/base44Client';

export const MAX_INVOICE_FILE_BYTES = 10 * 1024 * 1024;

export const validateInvoiceFile = (file) => {
  if (!file) return 'Escolha um arquivo PDF.';
  if (file.size === 0) return 'O arquivo está vazio.';
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  if (!isPdf) return 'O arquivo precisa ser um PDF da fatura.';
  if (file.size > MAX_INVOICE_FILE_BYTES) return 'O arquivo passa de 10 MB. Envie uma versão menor.';
  return null;
};

/** Upload privado: o PDF não recebe URL pública. */
export const uploadInvoicePdf = async (file) => {
  const result = await base44.integrations.Core.UploadPrivateFile({ file });
  const fileUri = result?.file_uri;
  if (!fileUri) throw new Error('O envio do arquivo não retornou um identificador.');
  return fileUri;
};

export const extractInvoiceFromPdf = async (fileUri) => {
  const response = await base44.functions.invoke('extractCardInvoice', { file_uri: fileUri });
  const data = response?.data || {};
  if (data.error) throw new Error(data.error);
  if (!data.document) throw new Error('A leitura não retornou dados da fatura.');
  return data;
};