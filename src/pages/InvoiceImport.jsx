import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import SectionCard from '@/components/common/SectionCard';
import EmptyState from '@/components/common/EmptyState';
import Money from '@/components/common/Money';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/lib/workspace';
import { usePreferences } from '@/lib/preferences';
import { createRecord, createRecords, deleteRecords } from '@/lib/data';
import { buildInvoiceTransactions, invoiceFingerprint, invoiceTotals, normalizeInvoiceDocument } from '@/lib/finance/invoice';
import { buildReview, findInvoiceDuplicates, reviewItems, toggleItem, updateItem } from '@/lib/finance/invoice-review';
import { extractInvoiceFromPdf, uploadInvoicePdf, validateInvoiceFile } from '@/lib/invoice-service';
import InvoiceAlerts from '@/components/invoices/InvoiceAlerts';
import InvoiceChangeSummary from '@/components/invoices/InvoiceChangeSummary';
import InvoiceHeaderForm from '@/components/invoices/InvoiceHeaderForm';
import InvoiceItemsEditor from '@/components/invoices/InvoiceItemsEditor';
import InvoiceUploadCard from '@/components/invoices/InvoiceUploadCard';
import { CheckCircle2, CreditCard, RotateCcw } from 'lucide-react';

const IDLE = 'idle';

export default function InvoiceImport() {
  const { accounts, transactions, invoices, refresh } = useWorkspace();
  const { environment } = usePreferences();

  const [accountId, setAccountId] = useState('');
  const [status, setStatus] = useState(IDLE);
  const [document, setDocument] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const cardAccounts = useMemo(
    () => accounts.filter((account) => account.type === 'credit_card' && !account.archived),
    [accounts],
  );
  const account = cardAccounts.find((item) => item.id === accountId) || null;
  const busy = status === 'uploading' || status === 'extracting' || status === 'saving';

  const duplicates = useMemo(
    () => (document ? findInvoiceDuplicates(document, { invoices, transactions, accountId }) : null),
    [document, invoices, transactions, accountId],
  );
  const review = useMemo(
    () => (document ? buildReview({ document, items, duplicates, accountId }) : null),
    [document, items, duplicates, accountId],
  );

  const reset = () => {
    setStatus(IDLE);
    setDocument(null);
    setItems([]);
    setError(null);
    setResult(null);
  };

  const handleFile = async (file) => {
    const invalid = validateInvoiceFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    if (!accountId) {
      setError('Escolha o cartão antes de enviar o PDF.');
      return;
    }

    setError(null);
    setResult(null);
    try {
      setStatus('uploading');
      const fileUri = await uploadInvoicePdf(file);
      setStatus('extracting');
      const extracted = await extractInvoiceFromPdf(fileUri);
      const documentEnvironment = account?.environment || (environment === 'consolidado' ? 'pf' : environment);
      const normalized = normalizeInvoiceDocument(extracted.document, { accountId, environment: documentEnvironment });
      if (!normalized.hasContent) throw new Error('Nenhum dado financeiro foi reconhecido neste PDF.');

      const fingerprint = invoiceFingerprint({
        accountId,
        dueDate: normalized.dueDate,
        declaredTotal: normalized.fields.declaredTotal,
        periodFrom: normalized.periodFrom,
        periodTo: normalized.periodTo,
        items: normalized.items,
      });

      setDocument({
        ...normalized,
        extractedFingerprint: fingerprint,
        extractionWarnings: extracted.warnings || [],
        fileUri,
        fileName: file.name,
        extractedBy: extracted.source || null,
      });
      setItems(reviewItems(normalized, { transactions, accountId }));
      setStatus('review');
    } catch (uploadError) {
      setStatus(IDLE);
      setError(uploadError?.message || 'Não foi possível ler a fatura.');
    }
  };

  const recalcItems = (nextItems) => {
    setItems(nextItems);
    setDocument((current) =>
      current
        ? {
            ...current,
            calculated: {
              ...current.calculated,
              ...invoiceTotals(nextItems),
              itemsCount: nextItems.length,
            },
          }
        : current,
    );
  };

  const handleHeaderChange = (field, value, nested) => {
    setDocument((current) => {
      if (!current) return current;
      if (field === 'fields') return { ...current, fields: { ...current.fields, [nested]: value } };
      return { ...current, [field]: value };
    });
  };

  const handleConfirm = async () => {
    if (!review?.canConfirm || !account) return;
    setError(null);
    setStatus('saving');

    const payloads = buildInvoiceTransactions(document, {
      accountId,
      environment: account.environment,
      selectedIds: review.selectedIds,
    });

    let created = [];
    try {
      created = await createRecords('Transaction', payloads);
      const createdIds = (created || []).map((record) => record.id).filter(Boolean);

      await createRecord('CardInvoice', {
        account_id: accountId,
        environment: account.environment,
        institution: document.institution || '',
        card_mask: document.cardMask || '',
        closing_date: document.closingDate || undefined,
        due_date: document.dueDate || undefined,
        period_from: document.periodFrom || undefined,
        period_to: document.periodTo || undefined,
        previous_balance: document.fields.previousBalance || 0,
        declared_total: document.fields.declaredTotal || 0,
        minimum_payment: document.fields.minimumPayment || 0,
        items_total: review.createTotal,
        items_count: createdIds.length,
        summary_only: Boolean(document.summaryOnly),
        fingerprint: duplicates?.fingerprint || document.extractedFingerprint || '',
        source: 'pdf_import',
        source_file_name: document.fileName || '',
        source_file_uri: document.fileUri || '',
        status: 'confirmado',
        transaction_ids: createdIds,
      });

      await refresh();
      setResult({ count: createdIds.length, total: review.createTotal, card: account.name });
      setStatus('done');
    } catch (confirmError) {
      if (created?.length) {
        const ids = created.map((record) => record.id).filter(Boolean);
        if (ids.length) await deleteRecords('Transaction', ids).catch(() => {});
      }
      setStatus('review');
      setError(confirmError?.message || 'A importação não foi concluída. Nenhum lançamento foi mantido.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar fatura em PDF"
        description="Envie a fatura do cartão, confira cada lançamento e só então grave. A importação não cria dívidas nem duplica o total da fatura."
      />

      {cardAccounts.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhum cartão cadastrado"
          description="A fatura precisa estar vinculada a uma conta do tipo cartão de crédito. Cadastre o cartão e volte aqui."
          action={
            <Button size="sm" className="mt-1" asChild>
              <Link to="/contas">Cadastrar cartão</Link>
            </Button>
          }
        />
      ) : (
        <>
          {status === 'done' && result ? (
            <SectionCard title="Importação concluída">
              <div className="space-y-3">
                <p className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>
                    {result.count} lançamento(s) criados em {result.card}, somando <Money value={result.total} maskable={false} /> no
                    saldo do cartão.
                  </span>
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/lancamentos">Ver lançamentos</Link>
                  </Button>
                  <Button size="sm" onClick={reset}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Importar outra fatura
                  </Button>
                </div>
              </div>
            </SectionCard>
          ) : (
            <>
              <InvoiceUploadCard
                accounts={cardAccounts}
                accountId={accountId}
                onAccountChange={setAccountId}
                onFile={handleFile}
                status={status}
                error={status === 'review' || status === 'saving' ? null : error}
              />

              {document && review ? (
                <div className="space-y-4">
                  <InvoiceAlerts document={document} duplicates={duplicates} />
                  <InvoiceHeaderForm document={document} onChange={handleHeaderChange} />
                  <InvoiceItemsEditor
                    items={items}
                    onToggle={(id) => recalcItems(toggleItem(items, id))}
                    onUpdate={(id, patch) => recalcItems(updateItem(items, id, patch))}
                  />
                  {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
                  <InvoiceChangeSummary
                    review={review}
                    saving={busy}
                    onConfirm={handleConfirm}
                    onCancel={reset}
                  />
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}