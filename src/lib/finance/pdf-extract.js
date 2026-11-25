import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parseInvoiceText, reconstructPdfLines } from './pdf-parser.js';

GlobalWorkerOptions.workerSrc = workerUrl;

export const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_PDF_PAGES = 40;
const MAX_EXTRACTED_CHARACTERS = 500_000;

export { parseInvoiceText, reconstructPdfLines };

export async function extractInvoicePdf(input) {
  const bytes = new Uint8Array(input);
  if (!bytes.length || bytes.length > MAX_PDF_BYTES) {
    throw Object.assign(new Error('O PDF está vazio ou excede o limite de 10 MiB.'), { status: bytes.length ? 413 : 400 });
  }
  if (String.fromCharCode(...bytes.subarray(0, 5)) !== '%PDF-') {
    throw Object.assign(new Error('O arquivo enviado não é um PDF válido.'), { status: 415 });
  }

  let loadingTask;
  try {
    loadingTask = getDocument({
      data: bytes,
      disableFontFace: true,
      isEvalSupported: false,
      verbosity: 0,
    });
    const document = await loadingTask.promise;
    if (document.numPages > MAX_PDF_PAGES) {
      throw Object.assign(new Error('O PDF excede o limite de 40 páginas.'), { status: 413 });
    }

    const lines = [];
    let characterCount = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageLines = reconstructPdfLines(content.items, { pageWidth: page.view?.[2] || page.width || 0 });
      characterCount += pageLines.reduce((total, line) => total + line.length, 0);
      if (characterCount > MAX_EXTRACTED_CHARACTERS) {
        throw Object.assign(new Error('O conteúdo de texto do PDF excede o limite de leitura.'), { status: 413 });
      }
      lines.push(...pageLines);
    }
    return parseInvoiceText(lines.join('\n'));
  } catch (error) {
    if (Number(error.status)) throw error;
    throw Object.assign(new Error('Não foi possível ler o conteúdo deste PDF.'), { status: 422 });
  } finally {
    await loadingTask?.destroy();
  }
}
