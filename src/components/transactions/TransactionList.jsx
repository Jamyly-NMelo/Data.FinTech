import React from 'react';
import { Check, MoreHorizontal, Pencil, Trash2, XCircle } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import Money from '@/components/common/Money';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { openAmount, statusLabel } from '@/lib/finance/ledger';
import { formatDate } from '@/lib/format';

export default function TransactionList({
  transactions = [],
  accounts = [],
  categories = [],
  onNew,
  onEdit,
  onSettle,
  onCancel,
  onDelete,
}) {
  if (!transactions.length) {
    return <EmptyState title="Nenhum lançamento encontrado" description="Ajuste os filtros ou cadastre um novo lançamento." action={<Button size="sm" onClick={onNew}>Novo lançamento</Button>} />;
  }
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-xs">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Lançamento</th>
              <th className="px-4 py-3">Conta / categoria</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => {
              const isOpen = openAmount(transaction) > 0;
              return (
                <tr key={transaction.id} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <p className="font-medium">{transaction.description}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{transaction.kind === 'income' ? 'Receita' : transaction.kind === 'transfer' ? 'Transferência' : 'Despesa'}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <p>{accountNames.get(transaction.account_id) || 'Conta removida'}</p>
                    <p className="mt-1">{categoryNames.get(transaction.category_id) || (transaction.kind === 'transfer' ? accountNames.get(transaction.counterpart_account_id) || 'Transferência' : 'Sem categoria')}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(transaction.due_date || transaction.competence_date)}</td>
                  <td className="px-4 py-3"><Badge variant={transaction.status === 'cancelled' ? 'destructive' : transaction.status === 'settled' ? 'secondary' : 'outline'}>{statusLabel(transaction)}</Badge></td>
                  <td className="px-4 py-3 text-right"><Money value={transaction.amount} colored className="font-medium" /></td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Ações do lançamento"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit?.(transaction)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        {isOpen && transaction.status !== 'cancelled' ? <DropdownMenuItem onClick={() => onSettle?.(transaction)}><Check className="mr-2 h-4 w-4" />Liquidar</DropdownMenuItem> : null}
                        {transaction.status !== 'cancelled' ? <DropdownMenuItem onClick={() => onCancel?.(transaction)}><XCircle className="mr-2 h-4 w-4" />Cancelar</DropdownMenuItem> : null}
                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(transaction)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
