import React, { useMemo, useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import SectionCard from '@/components/common/SectionCard';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Money from '@/components/common/Money';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/lib/workspace';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { exportWorkspaceData, replaceWorkspaceData } from '@/lib/data';
import {
  BACKUP_ENTITIES,
  FORMAT_VERSION,
  buildBackupPayload,
  parseBackupText,
  restoreBackupText,
} from '@/lib/finance/backup';
import { formatDate, todayISO } from '@/lib/format';
import { AlertTriangle, Download, FileJson, ShieldCheck, Upload } from 'lucide-react';

const ENTITY_LABELS = {
  Account: 'Contas',
  Category: 'Categorias',
  Transaction: 'Lançamentos',
  Budget: 'Orçamentos',
  Goal: 'Metas',
  Debt: 'Dívidas',
  Investment: 'Ativos',
  InvestmentOperation: 'Operações',
  Pricing: 'Precificação',
  TaxScenario: 'Cenários tributários',
  Preferences: 'Preferências',
};

export default function Backup() {
  const { refresh } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();

  const [exporting, setExporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileText, setFileText] = useState('');
  const [result, setResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState('');

  const counts = useMemo(() => result?.preview?.counts || null, [result]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const collections = await exportWorkspaceData();
      const payload = buildBackupPayload(collections, { generated_by: user?.email || null });
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `data-fintech-backup-${todayISO()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      const total = BACKUP_ENTITIES.reduce((sum, entity) => sum + (payload.data[entity]?.length || 0), 0);
      toast({ title: 'Backup gerado', description: `${total} registros exportados com a versão ${FORMAT_VERSION} do formato.` });
    } catch (error) {
      toast({ title: 'Não foi possível exportar', description: error.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileText('');
    setResult(null);
    const text = await file.text();
    setFileText(text);
    const validation = parseBackupText(text);
    setResult(validation);
    if (!validation.ok) {
      toast({
        title: 'Arquivo recusado',
        description: 'Nenhum dado foi alterado. Veja os problemas listados abaixo.',
        variant: 'destructive',
      });
    }
  };

  const handleRestore = async () => {
    if (!result?.ok || !fileText) {
      toast({
        title: 'Arquivo não validado',
        description: 'Selecione e valide um backup antes de confirmar a restauração.',
        variant: 'destructive',
      });
      return;
    }

    const validation = parseBackupText(fileText);
    if (!validation.ok) {
      setResult(validation);
      setConfirmOpen(false);
      toast({
        title: 'Arquivo recusado',
        description: 'A validação falhou. Nenhum dado foi alterado.',
        variant: 'destructive',
      });
      return;
    }

    setRestoring(true);
    try {
      await restoreBackupText(fileText, (data) => replaceWorkspaceData(data, { onProgress: setProgress }));
      await refresh();
      setResult(null);
      setFileName('');
      setFileText('');
      const { create, ignore, reject } = validation.preview.importCounts;
      toast({
        title: 'Importação concluída',
        description: `${create} registro(s) criado(s), ${ignore} ignorado(s) e ${reject} rejeitado(s). Os dados anteriores foram substituídos.`,
      });
    } catch (error) {
      await refresh();
      toast({ title: 'Importação não concluída', description: error.message, variant: 'destructive' });
    } finally {
      setRestoring(false);
      setProgress('');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup e dados"
        description={`Exportação e restauração em JSON com validação integral, prévia do conteúdo e confirmação antes de substituir. Formato na versão ${FORMAT_VERSION}.`}
      />

      <div className="surface-card flex items-start gap-3 p-4 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        <p>
          A aplicação não armazena credenciais bancárias nem senhas. O arquivo de backup contém apenas os registros que
          você criou, vinculados à sua conta — cada usuário vê e restaura somente os próprios dados.
        </p>
      </div>

      <SectionCard
        title="Exportar"
        description="Gera um arquivo com contas, categorias, lançamentos, orçamentos, metas, dívidas, investimentos, precificação e cenários tributários."
        action={
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? 'Gerando…' : 'Baixar backup'}
          </Button>
        }
      >
        <ul className="grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
          {BACKUP_ENTITIES.map((entity) => (
            <li key={entity} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {ENTITY_LABELS[entity] || entity}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Restaurar"
        description="Validação integral antes de importar: um arquivo com qualquer problema é recusado e sua base atual não é alterada."
      >
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/30 px-4 py-6 text-center transition-colors hover:bg-muted/50">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Selecionar arquivo JSON de backup</span>
            <span className="text-[11px] text-muted-foreground">{fileName || 'Nenhum arquivo selecionado'}</span>
            <input type="file" accept="application/json,.json" className="hidden" onChange={handleFile} />
          </label>

          {result ? (
            <div className="space-y-4">
              {result.errors.length ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <p className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    Arquivo recusado ({result.errors.length} problema(s))
                  </p>
                  <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto">
                    {result.errors.slice(0, 30).map((message) => (
                      <li key={message}>• {message}</li>
                    ))}
                  </ul>
                  {result.errors.length > 30 ? (
                    <p className="mt-2">… e mais {result.errors.length - 30} problema(s).</p>
                  ) : null}
                </div>
              ) : null}

              {result.preview?.importCounts ? (
                <p className="rounded-xl border border-border/70 bg-muted/30 p-3 text-xs text-muted-foreground" role="status">
                  Previsão: {result.preview.importCounts.create} registro(s) serão criados,{' '}
                  {result.preview.importCounts.ignore} ignorados e {result.preview.importCounts.reject} registro(s)/arquivo rejeitado(s).
                  {result.ok ? ' Coleções desconhecidas são ignoradas; qualquer erro rejeita o arquivo inteiro.' : ' Nenhum registro será gravado.'}
                </p>
              ) : null}

              {result.warnings.length ? (
                <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs">
                  <p className="font-semibold">Avisos ({result.warnings.length})</p>
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-muted-foreground">
                    {result.warnings.slice(0, 10).map((message) => (
                      <li key={message}>• {message}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {result.ok && result.preview ? (
                <div className="rounded-xl border border-border/70 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <FileJson className="h-4 w-4" />
                    Prévia do conteúdo
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Período</p>
                      <p className="mt-1 text-xs font-medium">
                        {result.preview.period
                          ? `${formatDate(result.preview.period.from)} a ${formatDate(result.preview.period.to)}`
                          : 'Sem lançamentos'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Resultado no arquivo</p>
                      <p className="mt-1 text-xs font-medium">
                        <Money value={result.preview.totals.result} colored />
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Transferências</p>
                      <p className="mt-1 text-xs font-medium">
                        <Money value={result.preview.totals.transfers} />
                      </p>
                    </div>
                  </div>

                  <ul className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(counts || {}).map(([entity, value]) => (
                      <li key={entity}>
                        <Badge variant={value > 0 ? 'secondary' : 'outline'} className="text-[10px]">
                          {ENTITY_LABELS[entity] || entity}: {value}
                        </Badge>
                      </li>
                    ))}
                  </ul>

                  {result.preview.samples?.length ? (
                    <div className="mt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Amostra de lançamentos</p>
                      <ul className="mt-2 space-y-1 text-xs">
                        {result.preview.samples.map((sample, index) => (
                          <li key={`${sample.description}-${index}`} className="flex items-center justify-between gap-3">
                            <span className="truncate">{sample.description}</span>
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <span>{sample.date || '—'}</span>
                              <Money value={sample.amount} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
                      Importar e substituir meus dados
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setResult(null);
                        setFileName('');
                        setFileText('');
                      }}
                    >
                      Descartar arquivo
                    </Button>
                  </div>
                  {restoring ? <p className="mt-2 text-[11px] text-muted-foreground">{progress || 'Importando…'}</p> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Substituir seus dados pelo backup?"
        description={`Os registros atuais serão removidos e os do arquivo passarão a valer. ${result?.preview?.importCounts?.create || 0} registro(s) serão criados, ${result?.preview?.importCounts?.ignore || 0} ignorados e ${result?.preview?.importCounts?.reject || 0} registro(s)/arquivo rejeitado(s). Uma cópia de segurança é guardada automaticamente e reaplicada caso algo falhe.`}
        confirmLabel={restoring ? 'Importando…' : 'Substituir dados'}
        destructive
        onConfirm={handleRestore}
      />
    </div>
  );
}