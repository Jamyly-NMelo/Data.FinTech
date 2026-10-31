/** Envio e leitura da fatura em PDF (arquivo privado, sem URL pública permanente). */

import { post } from '@/services/api';

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
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo PDF.'));
    reader.readAsDataURL(file);
  });
  const result = await post('invoices.upload', {
    name: file.name,
    mime_type: file.type || 'application/pdf',
    base64: String(dataUrl).split(',')[1],
  });
  const fileUri = result?.file_uri;
  if (!fileUri) throw new Error('O envio do arquivo não retornou um identificador.');
  return fileUri;
};

export const extractInvoiceFromPdf = async (fileUri) => {
  const data = await post('invoices.extract', { file_uri: fileUri });
  if (data.error) throw new Error(data.error);
  if (!data.document) throw new Error('A leitura não retornou dados da fatura.');
  return data;
};