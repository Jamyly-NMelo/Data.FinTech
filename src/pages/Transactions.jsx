import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import FilterBar, { DEFAULT_FILTERS } from '@/components/common/FilterBar';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import FormDialog from '@/components/common/FormDialog';
import TransactionForm from '@/components/transactions/TransactionForm';
import TransactionList from '@/components/transactions/TransactionList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/lib/workspace';
import { usePreferences } from '@/lib/preferences';
import { useCollection } from '@/hooks/useCollection';
import { countRecords } from '@/lib/data';
import { openAmount } from '@/lib/finance/ledger';
import { resolveRange } from '@/lib/finance/periods';
import { formatCurrency, todayISO } from '@/lib/format';
import { Plus } from 'lucide-react';

export default function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { environment } = usePreferences();
  const { accounts, categories, create, update, remove } = useWorkspace();

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [settling, setSettling] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [total, setTotal] = useState(null);

  useEffect(() => {
    if (searchParams.get('novo') !== '1') return;
    setEditing(null);
    setFormOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('novo');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const range = useMemo(() => resolveRange(filters.period, { from: filters.from, to: filters.to }), [filters]);

  const query = useMemo(() => {
    const next = {};
    if (filters.status !== 'all') next.status = filters.status;
    if (filters.accountId !== 'all') next.account_id = filters.accountId;
    if (filters.categoryId !== 'all') next.category_id = filters.categoryId;
    if (environment !== 'consolidado') next.environment = environment;
    if (debouncedSearch) next.description = { $regex: debouncedSearch };

    if (range.from && range.to) {
      next.$or = [
        { due_date: { $gte: range.from, $lte: range.to } },
        { settlement_date: { $gte: range.from, $lte: range.to } },
      ];
    }

    return next;
  }, [filters.status, filters.accountId, filters.categoryId, environment, debouncedSearch, range.from, range.to]);

  const { items, loading, hasMore, loadMore, loadingMore, error, refresh } = useCollection('Transaction', {
    query,
    sort: '-due_date',
    limit: 25,
  });

  useEffect(() => {
    let active = true;
    countRecords('Transaction', query)
      .then((value) => {
        if (active) setTotal(Number(value) || 0);
      })
      .catch(() => {
        if (active) setTotal(null);
      });
    return () => {
      active = false;
    };
  }, [query]);

  const runAction = async (action) => {
    await action();
    refresh();
  };

  const handleSubmit = async (payload) => {
    if (editing) {
      await update('Transaction', editing.id, payload);
    } else {
      await create('Transaction', payload);
    }
    refresh();
  };

  const handleSettle = async (values) => {
    await update('Transaction', settling.id, {
      status: 'settled',
      settlement_date: values.settlement_date || todayISO(),
      settled_amount: Number(values.settled_amount) || Number(settling.amount) || 0,
    });
    refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lançamentos"
        description="Cadastro, edição, pesquisa e liquidação. Saldos contam apenas o que já foi liquidado; pendências alimentam as projeções."
        badge={
          <Badge variant="outline" className="text-[11px]">
            {range.label}
          </Badge>
        }
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo lançamento
          </Button>
        }
      />

      <FilterBar
        filters={filters}
        onChange={setFilters}
        accounts={accounts}
        categories={categories}
        showSearch
        search={search}
        onSearchChange={setSearch}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {loading && items.length === 0
            ? 'Carregando lançamentos…'
            : total === null
              ? `${items.length} lançamento(s) exibido(s)`
              : `${total} lançamento(s) no filtro · ${items.length} carregado(s)`}
        </span>
        {environment !== 'consolidado' ? <span>Ambiente ativo aplicado ao filtro.</span> : null}
      </div>

      {error ? (
        <div className="surface-card p-4 text-sm text-destructive">
          Não foi possível carregar os lançamentos. Ajuste os filtros ou tente novamente.
        </div>
      ) : (
        <TransactionList
          transactions={items}
          accounts={accounts}
          categories={categories}
          onNew={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          onEdit={(transaction) => {
            setEditing(transaction);
            setFormOpen(true);
          }}
          onSettle={setSettling}
          onCancel={setCancelling}
          onDelete={setDeleting}
        />
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Carregando…' : 'Carregar mais 25'}
          </Button>
        </div>
      ) : null}

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
        accounts={accounts}
        categories={categories}
        onSubmit={handleSubmit}
      />

      <FormDialog
        open={Boolean(settling)}
        onOpenChange={(open) => !open && setSettling(null)}
        title="Liquidar lançamento"
        description={settling ? `${settling.description} · em aberto ${formatCurrency(openAmount(settling))}` : ''}
        columns={1}
        submitLabel="Confirmar liquidação"
        initialValues={{ settlement_date: todayISO(), settled_amount: settling ? String(openAmount(settling)) : '' }}
        fields={[
          { name: 'settlement_date', label: 'Data de liquidação', type: 'date', required: true },
          {
            name: 'settled_amount',
            label: 'Valor liquidado',
            type: 'currency',
            required: true,
            help: 'Valor menor que o total caracteriza pagamento ou recebimento parcial.',
          },
        ]}
        onSubmit={handleSettle}
      />

      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="Cancelar lançamento"
        description={
          cancelling
            ? `"${cancelling.description}" sai dos cálculos de saldo e resultado, mas permanece no histórico.`
            : ''
        }
        confirmLabel="Cancelar lançamento"
        destructive
        onConfirm={() => runAction(() => update('Transaction', cancelling.id, { status: 'cancelled' }))}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Excluir lançamento"
        description={deleting ? `"${deleting.description}" será removido definitivamente.` : ''}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => runAction(() => remove('Transaction', deleting.id))}
      />
    </div>
  );
}