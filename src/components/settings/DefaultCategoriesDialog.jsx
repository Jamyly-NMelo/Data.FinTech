import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEFAULT_CATEGORY_NOTES, buildCategoryPayload, defaultCategoryPlan, pendingDefaultCategories } from '@/lib/finance/defaultCategories';

const ENVIRONMENTS = [
  { value: 'pf', label: 'Finanças Pessoais' },
  { value: 'pj', label: 'Finanças Empresariais' },
  { value: 'invest', label: 'Investimentos' },
];

export default function DefaultCategoriesDialog({ open, onOpenChange, categories = [], initialEnvironment = 'pf', onCreate }) {
  const [environment, setEnvironment] = useState(initialEnvironment);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const plan = useMemo(() => defaultCategoryPlan({ environment, existingCategories: categories }), [environment, categories]);
  const available = useMemo(() => plan.filter((item) => !item.exists), [plan]);
  const selectedItems = useMemo(() => pendingDefaultCategories(plan, selected), [plan, selected]);

  useEffect(() => {
    if (!open) return;
    setEnvironment(initialEnvironment);
    setError('');
  }, [open, initialEnvironment]);

  useEffect(() => {
    setSelected(available.map((item) => item.key));
  }, [environment, categories]);

  const handleCreate = async () => {
    setBusy(true);
    setError('');
    try {
      await onCreate(buildCategoryPayload(selectedItems, environment));
      onOpenChange(false);
    } catch (createError) {
      setError(createError?.message || 'Não foi possível criar as categorias.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Categorias padrão</DialogTitle>
          <DialogDescription>Selecione categorias ainda não cadastradas para adicionar ao ambiente.</DialogDescription>
        </DialogHeader>
        <Select value={environment} onValueChange={setEnvironment}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ENVIRONMENTS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="space-y-2">
          {plan.map((item) => (
            <label key={item.key} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={item.exists || selected.includes(item.key)}
                disabled={item.exists || busy}
                onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.key] : current.filter((key) => key !== item.key))}
              />
              <span className="min-w-0 flex-1">{item.name}</span>
              <span className="text-[10px] text-muted-foreground">{item.exists ? 'Já cadastrada' : item.kind === 'income' ? 'Receita' : 'Despesa'}</span>
            </label>
          ))}
        </div>
        {DEFAULT_CATEGORY_NOTES[environment]?.length ? (
          <ul className="space-y-1 text-xs text-muted-foreground">{DEFAULT_CATEGORY_NOTES[environment].map((note) => <li key={note}>{note}</li>)}</ul>
        ) : null}
        {error ? <p className="flex items-start gap-2 text-sm text-destructive" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button type="button" onClick={handleCreate} disabled={busy || selectedItems.length === 0}>
            {busy ? 'Adicionando…' : `Adicionar ${selectedItems.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
