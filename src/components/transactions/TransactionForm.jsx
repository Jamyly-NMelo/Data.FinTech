import React, { useMemo } from 'react';
import FormDialog from '@/components/common/FormDialog';
import { usePreferences } from '@/lib/preferences';
import { todayISO } from '@/lib/format';

const KIND_OPTIONS = [
  { value: 'income', label: 'Receita' },
  { value: 'expense', label: 'Despesa' },
  { value: 'transfer', label: 'Transferência' },
];

export default function TransactionForm({ open, onOpenChange, transaction, accounts = [], categories = [], onSubmit }) {
  const { environment } = usePreferences();
  const accountOptions = useMemo(
    () => accounts.filter((account) => !account.archived).map((account) => ({ value: account.id, label: account.name })),
    [accounts],
  );
  const categoryOptions = useMemo(
    () => [
      { value: '__none', label: 'Sem categoria' },
      ...categories.map((category) => ({ value: category.id, label: category.name })),
    ],
    [categories],
  );
  const fields = useMemo(
    () => (values) => [
      { name: 'description', label: 'Descrição', type: 'text', required: true, colSpan: 2 },
      { name: 'kind', label: 'Tipo', type: 'select', options: KIND_OPTIONS, required: true },
      { name: 'amount', label: 'Valor', type: 'currency', required: true },
      { name: 'environment', label: 'Ambiente', type: 'select', options: [
        { value: 'pf', label: 'Finanças Pessoais' },
        { value: 'pj', label: 'Finanças Empresariais' },
        { value: 'invest', label: 'Investimentos' },
      ], required: true },
      { name: 'account_id', label: values.kind === 'income' ? 'Conta de destino' : 'Conta de origem', type: 'select', options: accountOptions, required: true, colSpan: 2 },
      ...(values.kind === 'transfer'
        ? [{ name: 'counterpart_account_id', label: 'Conta de destino', type: 'select', options: accountOptions.filter((option) => option.value !== values.account_id), required: true, colSpan: 2 }]
        : [{ name: 'category_id', label: 'Categoria', type: 'select', options: categoryOptions, colSpan: 2 }]),
      { name: 'competence_date', label: 'Competência', type: 'date' },
      { name: 'due_date', label: 'Vencimento', type: 'date' },
      { name: 'settlement_date', label: 'Data de liquidação', type: 'date' },
      { name: 'notes', label: 'Observações', type: 'textarea', colSpan: 2 },
    ],
    [accountOptions, categoryOptions],
  );
  const initialValues = transaction
    ? { ...transaction, category_id: transaction.category_id || '__none' }
    : {
        kind: 'expense',
        amount: '',
        environment: environment === 'consolidado' ? 'pf' : environment,
        competence_date: todayISO(),
        due_date: todayISO(),
        status: 'pending',
      };

  const handleSubmit = (values) =>
    onSubmit({
      ...values,
      category_id: values.kind === 'transfer' || values.category_id === '__none' ? null : values.category_id,
      counterpart_account_id: values.kind === 'transfer' ? values.counterpart_account_id : null,
    });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={transaction ? 'Editar lançamento' : 'Novo lançamento'}
      columns={2}
      initialValues={initialValues}
      fields={fields}
      onSubmit={handleSubmit}
    />
  );
}
