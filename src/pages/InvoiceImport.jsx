import { useMemo, useState } from 'react';
import { AlertTriangle, Check, FileText, Loader2, Upload } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import SectionCard from '@/components/common/SectionCard';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/lib/preferences';
import { useWorkspace } from '@/lib/workspace';
import api, { post } from '@/services/api';
import {
  ITEM_TYPE,
  ITEM_TYPE_LABELS,
  buildInvoiceTransactions,
  invoiceFingerprint,
  invoiceTotals,
  normalizeInvoiceDocument,
} from '@/lib/finance/invoice';
import {
  buildReview,
  findInvoiceDuplicates,
  reviewItems,
  updateItem,
} from '@/lib/finance/invoice-review';
import { formatCurrency } from '@/lib/format';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ENVIRONMENTS = [
  { value: 'pf', label: 'Finanças pessoais (PF)' },
  { value: 'pj', label: 'Finanças empresariais (PJ)' },
];

const inputClass = 'h-9 w-full rounded-lg border border-input bg-background px-2 text-sm';

export default function InvoiceImport() {
  const { environment: preferredEnvironment } = usePreferences();
  const { accounts, transactions, invoices, refresh } = useWorkspace();
  const [environment, setEnvironment] = useState(
    preferredEnvironment === 'pj' ? 'pj' : 'pf',
  );
  const [accountId, setAccountId] = useState('');
  const [document, setDocument] = useState(null);
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const cards = useMemo(
    () => accounts.filter((account) =>
      account.type === 'credit_card' &&
      !account.archived &&
      (account.environment || 'pf') === environment,
    ),
    [accounts, environment],
  );
  const selectedAccount = cards.find((account) => account.id === accountId) || null;

  const reviewDocument = useMemo(() => {
    if (!document || !accountId) return document;
    return {
      ...document,
      extractedFingerprint: invoiceFingerprint({
        accountId,
        dueDate: document.dueDate,
        declaredTotal: document.fields.declaredTotal,
        periodFrom: document.periodFrom,
        periodTo: document.periodTo,
        items: document.items,
      }),
    };
  }, [document, accountId]);

  const duplicates = useMemo(
    () => reviewDocument && accountId
      ? findInvoiceDuplicates(reviewDocument, { invoices, transactions, accountId })
      : null,
    [reviewDocument, invoices, transactions, accountId],
  );
  const review = useMemo(
    () => reviewDocument
      ? buildReview({ document: reviewDocument, items, duplicates, accountId })
      : null,
    [reviewDocument, items, duplicates, accountId],
  );
  const totals = useMemo(() => invoiceTotals(items), [items]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setSuccess('');
    if (!file.name.toLowerCase().endsWith('.pdf') || file.size < 1 || file.size > MAX_FILE_BYTES) {
      setError('Selecione um arquivo PDF válido com até 10 MiB.');
      return;
    }

    setUploading(true);
    setDocument(null);
    setItems([]);
    try {
      const extracted = await api.enviarFaturaPdf(file);
      const normalized = normalizeInvoiceDocument(extracted, { accountId, environment });
      if (!normalized.hasContent || normalized.items.length === 0) {
        throw new Error('A leitura não identificou lançamentos importáveis. Nenhum dado foi confirmado.');
      }
      setDocument(normalized);
      setItems(reviewItems(normalized, { transactions, accountId }));
    } catch (uploadError) {
      setError(uploadError.message || 'Não foi possível ler o PDF. Nenhum dado foi confirmado.');
    } finally {
      setUploading(false);
    }
  };

  const selectAccount = (nextAccountId) => {
    setAccountId(nextAccountId);
    setError('');
    if (document) {
      const selectedIds = items.filter((item) => item.selected).map((item) => item.id);
      setItems(reviewItems(document, {
        transactions,
        accountId: nextAccountId,
        selectedIds,
      }));
    }
  };

  const editItem = (itemId, patch) => {
    setItems((current) => {
      const edited = updateItem(current, itemId, patch);
      const selectedIds = edited.filter((item) => item.selected).map((item) => item.id);
      return reviewItems({ ...document, items: edited }, {
        transactions,
        accountId,
        selectedIds,
      });
    });
  };

  const toggleItem = (itemId, checked) => {
    setItems((current) => {
      const edited = current.map((item) =>
        item.id === itemId ? { ...item, selected: checked } : item,
      );
      return reviewItems({ ...document, items: edited }, {
        transactions,
        accountId,
        selectedIds: edited.filter((item) => item.selected).map((item) => item.id),
      });
    });
  };

  const confirmImport = async () => {
    if (!review?.canConfirm || !selectedAccount || saving) return;
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const currentDocument = { ...reviewDocument, items };
      const selectedTransactions = buildInvoiceTransactions(currentDocument, {
        accountId,
        environment,
        selectedIds: review.selectedIds,
      });
      const invoice = {
        account_id: accountId,
        environment,
        institution: document.institution,
        card_mask: document.cardMask,
        closing_date: document.closingDate,
        due_date: document.dueDate,
        period_from: document.periodFrom,
        period_to: document.periodTo,
        previous_balance: document.fields.previousBalance || 0,
        declared_total: document.fields.declaredTotal || 0,
        minimum_payment: document.fields.minimumPayment || 0,
        items_total: totals.itemsTotal,
        items_count: items.length,
        summary_only: document.summaryOnly,
        fingerprint: reviewDocument.extractedFingerprint,
        source: 'pdf_import',
        status: 'confirmado',
        notes: document.warnings.join(' '),
      };

      await post('records.importInvoice', {
        invoice,
        transactions: selectedTransactions,
      });
      await refresh();
      setDocument(null);
      setItems([]);
      setSuccess(`${selectedTransactions.length} lançamento(s) e a fatura foram salvos.`);
    } catch (saveError) {
      setError(saveError.message || 'Não foi possível salvar a importação.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar fatura em PDF"
        description="Envie o arquivo de forma privada, revise os dados extraídos e confirme antes de gravar."
      />

      <SectionCard title="Arquivo e contexto">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium">
            Ambiente financeiro
            <select
              className={inputClass}
              value={environment}
              onChange={(event) => {
                setEnvironment(event.target.value);
                setAccountId('');
              }}
            >
              {ENVIRONMENTS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Cartão de crédito
            <select
              className={inputClass}
              value={accountId}
              onChange={(event) => selectAccount(event.target.value)}
            >
              <option value="">Escolha um cartão</option>
              {cards.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}{account.institution ? ` · ${account.institution}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        {cards.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Não há cartões ativos neste ambiente. Cadastre um cartão em Contas antes de importar.
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-input px-4 py-2 text-sm font-medium hover:bg-accent">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Lendo PDF…' : 'Selecionar PDF'}
            <input
              className="sr-only"
              type="file"
              accept="application/pdf,.pdf"
              disabled={uploading || !selectedAccount}
              onChange={handleUpload}
            />
          </label>
          <span className="text-xs text-muted-foreground">PDF até 10 MiB. O arquivo não é armazenado após a extração.</span>
        </div>
        {!selectedAccount ? (
          <p className="mt-2 text-xs text-muted-foreground">Escolha o cartão para habilitar o envio.</p>
        ) : null}
      </SectionCard>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      {success ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700" role="status">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      {document ? (
        <>
          <SectionCard title="Leitura extraída — revise antes de confirmar">
            <div className="mb-4 flex items-start gap-3 rounded-lg bg-muted/50 p-3 text-sm">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="font-medium">
                  {document.institution || 'Instituição não identificada'}
                  {document.cardMask ? ` · ${document.cardMask}` : ''}
                </p>
                <p className="text-muted-foreground">
                  Vencimento: {document.dueDate || 'não identificado'} · Fechamento: {document.closingDate || 'não identificado'} · Total declarado: {document.fields.declaredTotal === null ? 'não identificado' : formatCurrency(document.fields.declaredTotal)}
                </p>
              </div>
            </div>
            {document.warnings.length ? (
              <ul className="mb-4 list-inside list-disc space-y-1 text-xs text-amber-700">
                {document.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            ) : null}
            {duplicates?.alerts.length ? (
              <ul className="mb-4 space-y-1 text-xs text-amber-700">
                {duplicates.alerts.map((alert) => <li key={alert.code}>{alert.message}</li>)}
              </ul>
            ) : null}
            {duplicates?.blockers.length ? (
              <ul className="mb-4 space-y-1 text-sm text-destructive" role="alert">
                {duplicates.blockers.map((blocker) => <li key={blocker.code}>{blocker.message}</li>)}
              </ul>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="w-10 py-2">Importar</th>
                    <th className="min-w-52 py-2">Estabelecimento / descrição</th>
                    <th className="w-36 py-2">Tipo</th>
                    <th className="w-36 py-2">Data</th>
                    <th className="w-28 py-2">Valor</th>
                    <th className="w-28 py-2">Parcela</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b align-top">
                      <td className="py-2">
                        <input
                          type="checkbox"
                          aria-label={`Importar ${item.description}`}
                          checked={Boolean(item.selected)}
                          onChange={(event) => toggleItem(item.id, event.target.checked)}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className={inputClass}
                          aria-label="Descrição do lançamento"
                          value={item.description}
                          onChange={(event) => editItem(item.id, { description: event.target.value })}
                        />
                        {item.duplicate ? (
                          <span className="mt-1 block text-xs text-amber-700">{item.duplicate.label}</span>
                        ) : null}
                        {item.issues?.length ? (
                          <span className="mt-1 block text-xs text-amber-700">{item.issues.join(' ')}</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-2">
                        <select
                          className={inputClass}
                          aria-label="Tipo do lançamento"
                          value={item.type}
                          onChange={(event) => editItem(item.id, { type: event.target.value })}
                        >
                          {Object.entries(ITEM_TYPE_LABELS).filter(([type]) => type !== ITEM_TYPE.SUMMARY).map(([type, label]) => (
                            <option key={type} value={type}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className={inputClass}
                          aria-label="Data do lançamento"
                          type="date"
                          value={item.date || ''}
                          onChange={(event) => editItem(item.id, { date: event.target.value || null })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          className={inputClass}
                          aria-label="Valor do lançamento"
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount ?? ''}
                          onChange={(event) => editItem(item.id, {
                            amount: event.target.value === '' ? null : Number(event.target.value),
                          })}
                        />
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          <input
                            className={`${inputClass} w-12`}
                            aria-label="Parcela atual"
                            type="number"
                            min="1"
                            value={item.installmentCurrent ?? ''}
                            onChange={(event) => editItem(item.id, {
                              installmentCurrent: event.target.value === '' ? null : Number(event.target.value),
                            })}
                          />
                          <span>/</span>
                          <input
                            className={`${inputClass} w-12`}
                            aria-label="Total de parcelas"
                            type="number"
                            min="2"
                            value={item.installmentTotal ?? ''}
                            onChange={(event) => editItem(item.id, {
                              installmentTotal: event.target.value === '' ? null : Number(event.target.value),
                            })}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-sm">
              <p>{review?.createCount || 0} lançamento(s) · impacto estimado {formatCurrency(review?.createTotal || 0)} no cartão selecionado.</p>
              <Button type="button" disabled={!review?.canConfirm || saving} onClick={confirmImport}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? 'Salvando…' : 'Confirmar importação'}
              </Button>
            </div>
            {review?.errors.length ? (
              <ul className="mt-3 space-y-1 text-xs text-destructive" role="alert">
                {review.errors.map((message) => <li key={message}>{message}</li>)}
              </ul>
            ) : null}
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}
