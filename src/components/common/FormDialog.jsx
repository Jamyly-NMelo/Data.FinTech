import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toNumber } from '@/lib/finance/money';
import { toDateInputValue } from '@/lib/format';

const emptyValues = (fields) => {
  const base = {};
  fields.forEach((field) => {
    base[field.name] = field.type === 'switch' ? Boolean(field.default) : field.default ?? '';
  });
  return base;
};

const normalizeInitial = (fields, initialValues) => {
  const base = emptyValues(fields);
  fields.forEach((field) => {
    const raw = initialValues?.[field.name];
    if (raw === undefined || raw === null) return;
    if (field.type === 'date') base[field.name] = toDateInputValue(raw);
    else if (field.type === 'switch') base[field.name] = Boolean(raw);
    else base[field.name] = String(raw);
  });
  return base;
};

const parseValues = (fields, values) => {
  const parsed = {};
  fields.forEach((field) => {
    const raw = values[field.name];
    if (field.type === 'currency' || field.type === 'number' || field.type === 'percent') {
      parsed[field.name] = raw === '' || raw === undefined ? (field.required ? undefined : 0) : toNumber(raw);
    } else if (field.type === 'switch') {
      parsed[field.name] = Boolean(raw);
    } else if (field.type === 'date') {
      parsed[field.name] = raw || undefined;
    } else {
      parsed[field.name] = typeof raw === 'string' ? raw.trim() : raw;
    }
  });
  return parsed;
};

/**
 * Formulário em diálogo orientado por configuração.
 * `fields` pode ser uma lista ou uma função dos valores atuais (campos dinâmicos).
 */
export default function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initialValues = {},
  onSubmit,
  submitLabel = 'Salvar',
  columns = 1,
  validate,
  footerNote,
  children,
}) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  const resolvedFields = useMemo(() => {
    const list = typeof fields === 'function' ? fields(values) : fields;
    return (list || []).filter((field) => (field.hidden ? !field.hidden(values) : true));
  }, [fields, values]);

  const fieldsRef = useRef(fields);
  const initialRef = useRef(initialValues);
  fieldsRef.current = fields;
  initialRef.current = initialValues;

  // Reinicia apenas quando o diálogo abre (ou muda o registro em edição).
  useEffect(() => {
    if (!open) return;
    const source = fieldsRef.current;
    const list = typeof source === 'function' ? source({}) : source;
    setValues(normalizeInitial(list || [], initialRef.current));
    setErrors([]);
    setBusy(false);
  }, [open, initialValues?.id]);

  const setValue = (name, value) => setValues((current) => ({ ...current, [name]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const missing = resolvedFields
      .filter((field) => field.required && field.type !== 'switch')
      .filter((field) => {
        const value = values[field.name];
        return value === undefined || value === null || String(value).trim() === '';
      })
      .map((field) => `Preencha o campo "${field.label}".`);

    const custom = validate ? validate(values) : null;
    const customErrors = Array.isArray(custom) ? custom : custom ? [custom] : [];

    if (missing.length || customErrors.length) {
      setErrors([...missing, ...customErrors]);
      return;
    }

    setBusy(true);
    try {
      await onSubmit?.(parseValues(resolvedFields, values));
      onOpenChange(false);
    } catch (error) {
      setErrors([error?.message || 'Não foi possível salvar. Tente novamente.']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-xl overflow-y-auto p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={cn('grid gap-4', columns === 2 && 'sm:grid-cols-2')}>
            {resolvedFields.map((field) => (
              <div
                key={field.name}
                className={cn('space-y-1.5', field.colSpan === 2 && columns === 2 && 'sm:col-span-2')}
              >
                {field.type !== 'switch' ? (
                  <Label htmlFor={`field-${field.name}`} className="text-xs font-semibold">
                    {field.label}
                    {field.required ? <span className="ml-1 text-destructive">*</span> : null}
                  </Label>
                ) : null}

                {field.type === 'textarea' ? (
                  <Textarea
                    id={`field-${field.name}`}
                    value={values[field.name] ?? ''}
                    onChange={(event) => setValue(field.name, event.target.value)}
                    placeholder={field.placeholder}
                    rows={3}
                  />
                ) : field.type === 'select' ? (
                  <Select value={values[field.name] ?? ''} onValueChange={(value) => setValue(field.name, value)}>
                    <SelectTrigger id={`field-${field.name}`}>
                      <SelectValue placeholder={field.placeholder || 'Selecione'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options || []).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'date' ? (
                  <Input
                    id={`field-${field.name}`}
                    type="date"
                    value={values[field.name] ?? ''}
                    onChange={(event) => setValue(field.name, event.target.value)}
                  />
                ) : field.type === 'switch' ? (
                  <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2">
                    <span className="text-xs font-medium">{field.label}</span>
                    <Switch checked={Boolean(values[field.name])} onCheckedChange={(checked) => setValue(field.name, checked)} />
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      id={`field-${field.name}`}
                      value={values[field.name] ?? ''}
                      onChange={(event) => setValue(field.name, event.target.value)}
                      placeholder={field.placeholder}
                      inputMode={field.type === 'text' ? undefined : 'decimal'}
                      type={field.type === 'text' ? 'text' : 'text'}
                      className={cn(field.type === 'percent' && 'pr-8')}
                    />
                    {field.type === 'percent' ? (
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    ) : null}
                  </div>
                )}

                {field.help ? <p className="text-[11px] leading-relaxed text-muted-foreground">{field.help}</p> : null}
              </div>
            ))}
          </div>

          {children}

          {errors.length ? (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <ul className="space-y-0.5">
                {errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {footerNote ? <p className="text-[11px] leading-relaxed text-muted-foreground">{footerNote}</p> : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Salvando…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}