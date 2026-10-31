import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import FormDialog from '@/components/common/FormDialog';
import StatCard from '@/components/common/StatCard';
import Money from '@/components/common/Money';
import SectionCard from '@/components/common/SectionCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useWorkspace } from '@/lib/workspace';
import { usePreferences } from '@/lib/preferences';
import { accountBalance } from '@/lib/finance/ledger';
import { ENVIRONMENTS } from '@/lib/finance/metrics';
import { CreditCard, FileUp, Landmark, MoreHorizontal, Pencil, Plus, Trash2, Wallet } from 'lucide-react';

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Conta corrente' },
  { value: 'savings', label: 'Poupança / reserva' },
  { value: 'cash', label: 'Dinheiro em espécie' },
  { value: 'credit_card', label: 'Cartão de crédito' },
  { value: 'investment', label: 'Conta de investimento' },
];

const ENV_OPTIONS = ENVIRONMENTS.filter((item) => item.value !== 'consolidado').map((item) => ({
  value: item.value,
  label: item.label,
}));

const typeLabel = (type) => ACCOUNT_TYPES.find((item) => item.value === type)?.label || 'Conta';

const FIELDS = [
  { name: 'name', label: 'Nome da conta', type: 'text', required: true, placeholder: 'Ex.: Conta corrente' },
  { name: 'institution', label: 'Instituição', type: 'text', placeholder: 'Ex.: Banco do Brasil' },
  { name: 'type', label: 'Tipo', type: 'select', options: ACCOUNT_TYPES, required: true },
  { name: 'environment', label: 'Ambiente', type: 'select', options: ENV_OPTIONS, required: true },
  {
    name: 'opening_balance',
    label: 'Saldo inicial',
    type: 'currency',
    placeholder: '0,00',
    help: 'Ponto de partida do saldo. Só movimentos liquidados alteram esse valor.',
  },
  { name: 'credit_limit', label: 'Limite do cartão', type: 'currency', placeholder: '0,00' },
  { name: 'closing_day', label: 'Dia de fechamento', type: 'number' },
  { name: 'due_day', label: 'Dia de vencimento', type: 'number' },
  { name: 'notes', label: 'Observações', type: 'textarea', colSpan: 2 },
];

export default function Accounts() {
  const { accounts, transactions, create, update, remove } = useWorkspace();
  const { environment } = usePreferences();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const balances = useMemo(() => {
    const map = new Map();
    accounts.forEach((account) => map.set(account.id, accountBalance(account, transactions)));
    return map;
  }, [accounts, transactions]);

  const grouped = useMemo(() => {
    return ENVIRONMENTS.filter((item) => item.value !== 'consolidado')
      .map((item) => ({
        ...item,
        accounts: accounts
          .filter((account) => account.environment === item.value)
          .sort((a, b) => (balances.get(b.id) || 0) - (balances.get(a.id) || 0)),
      }))
      .filter((group) => group.accounts.length > 0);
  }, [accounts, balances]);

  const totals = useMemo(() => {
    let cash = 0;
    let cards = 0;
    let invested = 0;
    let cardsLimit = 0;
    accounts.forEach((account) => {
      const balance = balances.get(account.id) || 0;
      if (account.type === 'credit_card') {
        cards += Math.max(0, -balance);
        cardsLimit += Number(account.credit_limit) || 0;
      } else if (account.type === 'investment') invested += balance;
      else cash += balance;
    });
    return { cash, cards, invested, cardsLimit };
  }, [accounts, balances]);

  const handleSubmit = async (values) => {
    if (editing) await update('Account', editing.id, values);
    else await create('Account', values);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas e cartões"
        description="Saldos calculados exclusivamente com movimentos liquidados. Compras no cartão entram como despesa; o pagamento da fatura é uma transferência e não duplica o valor."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/importar-fatura">
                <FileUp className="mr-2 h-4 w-4" />
                Importar fatura em PDF
              </Link>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova conta
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Disponível" value={<Money value={totals.cash} />} icon={Wallet} tone="mint" hint="Contas correntes, reservas e dinheiro." />
        <StatCard
          label="Faturas em aberto"
          value={<Money value={totals.cards} />}
          icon={CreditCard}
          tone={totals.cards > 0 ? 'danger' : 'mint'}
          hint={totals.cardsLimit > 0 ? `Limite total cadastrado de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.cardsLimit)}.` : 'Cadastre o limite para acompanhar a utilização.'}
        />
        <StatCard label="Caixa em corretoras" value={<Money value={totals.invested} />} icon={Landmark} tone="navy" hint="Contas do tipo investimento." />
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta cadastrada"
          description="Cadastre contas correntes, cartões de crédito e contas de investimento para que os lançamentos tenham onde acontecer."
          action={
            <Button
              size="sm"
              className="mt-1"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Cadastrar primeira conta
            </Button>
          }
        />
      ) : null}

      {grouped.map((group) => (
        <SectionCard key={group.value} title={group.label} description={`${group.accounts.length} conta(s) neste ambiente.`}>
          <ul className="divide-y divide-border/60">
            {group.accounts.map((account) => {
              const balance = balances.get(account.id) || 0;
              const isCard = account.type === 'credit_card';
              const usedPercent = isCard && Number(account.credit_limit) > 0 ? Math.min(100, (Math.max(0, -balance) / Number(account.credit_limit)) * 100) : null;
              return (
                <li key={account.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{account.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {typeLabel(account.type)}
                      </Badge>
                      {account.archived ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Arquivada
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {account.institution || 'Sem instituição'}
                      {account.archived ? '' : ` · ambiente ${group.short}`}
                    </p>
                    {usedPercent !== null ? (
                      <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-warning" style={{ width: `${usedPercent}%` }} />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-right">
                      <Money value={balance} colored={isCard} className="text-sm font-semibold" />
                      <p className="text-[11px] text-muted-foreground">
                        {isCard ? (balance < 0 ? 'Fatura em aberto' : 'Sem fatura em aberto') : 'Saldo liquidado'}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Ações da conta">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => {
                            setEditing(account);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => update('Account', account.id, { archived: !account.archived })}
                        >
                          {account.archived ? 'Reativar conta' : 'Arquivar conta'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => setRemoving(account)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      ))}

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Editar conta' : 'Nova conta'}
        description="Contas arquivadas continuam no histórico, mas saem dos indicadores de disponibilidade."
        fields={FIELDS}
        initialValues={editing || { type: 'checking', environment: environment === 'consolidado' ? 'pf' : environment, opening_balance: '0', credit_limit: '0' }}
        columns={2}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Excluir conta"
        description={removing ? `"${removing.name}" será removida. Lançamentos vinculados continuarão existindo, mas sem conta correspondente.` : ''}
        confirmLabel="Excluir conta"
        destructive
        onConfirm={() => remove('Account', removing.id)}
      />
    </div>
  );
}