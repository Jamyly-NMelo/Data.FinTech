import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RANGE_OPTIONS } from '@/lib/finance/periods';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DEFAULT_FILTERS = {
  period: 'current_month',
  from: '',
  to: '',
  accountId: 'all',
  categoryId: 'all',
  status: 'all',
};

/** Barra de filtros compartilhada por painel e lançamentos. */
export default function FilterBar({
  filters = DEFAULT_FILTERS,
  onChange,
  accounts = [],
  categories = [],
  showStatus = true,
  showSearch = false,
  search = '',
  onSearchChange,
  className,
}) {
  const update = (patch) => onChange({ ...filters, ...patch });
  const reset = () => {
    onChange({ ...DEFAULT_FILTERS });
    onSearchChange?.('');
  };

  return (
    <div className={cn('surface-card flex flex-col gap-2 p-3 lg:flex-row lg:items-center', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.period} onValueChange={(value) => update({ period: value })}>
          <SelectTrigger className="h-9 w-[10.5rem] text-xs font-medium">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filters.period === 'custom' ? (
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={filters.from || ''}
              onChange={(event) => update({ from: event.target.value })}
              className="h-9 w-[9.5rem] text-xs"
              aria-label="Data inicial"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <Input
              type="date"
              value={filters.to || ''}
              onChange={(event) => update({ to: event.target.value })}
              className="h-9 w-[9.5rem] text-xs"
              aria-label="Data final"
            />
          </div>
        ) : null}

        <Select value={filters.accountId} onValueChange={(value) => update({ accountId: value })}>
          <SelectTrigger className="h-9 w-[11.5rem] text-xs font-medium">
            <SelectValue placeholder="Conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.categoryId} onValueChange={(value) => update({ categoryId: value })}>
          <SelectTrigger className="h-9 w-[12.5rem] text-xs font-medium">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showStatus ? (
          <Select value={filters.status} onValueChange={(value) => update({ status: value })}>
            <SelectTrigger className="h-9 w-[9.5rem] text-xs font-medium">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="settled">Liquidados</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="flex items-center gap-2 lg:ml-auto">
        {showSearch ? (
          <div className="relative w-full lg:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder="Buscar lançamento"
              className="h-9 pl-8 text-xs"
            />
          </div>
        ) : null}
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={reset}>
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      </div>
    </div>
  );
}