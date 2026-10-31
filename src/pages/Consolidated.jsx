import React, { useMemo } from 'react';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import Money from '@/components/common/Money';
import SectionCard from '@/components/common/SectionCard';
import EmptyState from '@/components/common/EmptyState';
import EquityChart from '@/components/dashboard/EquityChart';
import FlowChart from '@/components/dashboard/FlowChart';
import ProjectionPanel from '@/components/dashboard/ProjectionPanel';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/lib/workspace';
import { usePreferences } from '@/lib/preferences';
import { accountBalance } from '@/lib/finance/ledger';
import { cashProjection, filterTransactions, netWorth, periodSummary, upcomingCommitments } from '@/lib/finance/metrics';
import { debtTotals } from '@/lib/finance/debt';
import { resolveRange, previousRange } from '@/lib/finance/periods';
import { formatPercent } from '@/lib/format';
import { ArrowLeftRight, Building2, CreditCard, Landmark, Scale, Wallet } from 'lucide-react';

export default function Consolidated() {
  const { accounts, transactions, investments, operations, debts } = useWorkspace();
  const { preferences } = usePreferences();

  const range = useMemo(() => resolveRange('current_month', {}), []);
  const previous = useMemo(() => previousRange(range), [range]);

  const position = useMemo(() => netWorth(accounts, transactions, investments), [accounts, transactions, investments]);
  const summary = useMemo(() => periodSummary(filterTransactions(transactions, { environment: 'consolidado' }), range, previous), [transactions, range, previous]);
  const debtSummary = useMemo(() => debtTotals(debts), [debts]);
  const commitments = useMemo(
    () => upcomingCommitments(filterTransactions(transactions, { environment: 'consolidado' }), { days: 30 }),
    [transactions],
  );
  const projection = useMemo(
    () => cashProjection(accounts, transactions, { months: Math.min(preferences.projection_months || 12, 12) }),
    [accounts, transactions, preferences.projection_months],
  );

  const balances = useMemo(() => {
    const list = accounts.map((account) => ({ account, balance: accountBalance(account, transactions) }));
    return {
      assets: list.filter((item) => item.balance >= 0 && item.account.type !== 'credit_card').sort((a, b) => b.balance - a.balance),
      liabilities: [
        ...list.filter((item) => item.account.type === 'credit_card' && item.balance < 0).map((item) => ({ ...item, balance: Math.abs(item.balance) })),
      ].sort((a, b) => b.balance - a.balance),
    };
  }, [accounts, transactions]);

  const portfolio = position.portfolio;
  const totalLiabilities = position.liabilities + debtSummary.outstanding;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão consolidada"
        description="Patrimônio, passivos, caixa e projeções reunindo todos os ambientes. Transferências entre contas próprias são eliminadas para não inflar resultados."
        badge={
          <Badge variant="outline" className="text-[11px]">
            {formatPercent(summary.current.margin, 1)} de margem no mês
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Patrimônio líquido"
          value={<Money value={position.equity - debtSummary.outstanding} />}
          icon={Scale}
          tone="navy"
          hint={`Ativos de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(position.assets)} menos passivos de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalLiabilities)}.`}
        />
        <StatCard
          label="Caixa consolidado"
          value={<Money value={position.cash + position.brokerageCash} />}
          icon={Wallet}
          tone="mint"
          hint="Contas correntes, reservas, dinheiro e caixa em corretoras."
        />
        <StatCard
          label="Passivos"
          value={<Money value={totalLiabilities} />}
          icon={CreditCard}
          tone={totalLiabilities > 0 ? 'danger' : 'mint'}
          hint={`Faturas em aberto e ${debtSummary.count} dívida(s) cadastrada(s).`}
        />
        <StatCard
          label="Resultado do mês"
          value={<Money value={summary.current.result} colored />}
          delta={summary.comparison?.result}
          deltaLabel="vs. mês anterior"
          hint="Sem transferências internas."
          tone={summary.current.result >= 0 ? 'mint' : 'danger'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Composição do patrimônio" description="Todos os saldos consideram apenas movimentos liquidados.">
          {accounts.length === 0 ? (
            <EmptyState icon={Building2} compact title="Sem contas cadastradas" description="Cadastre contas e cartões para ver a composição consolidada." />
          ) : (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ativos</p>
                <ul className="space-y-1.5">
                  {balances.assets.map(({ account, balance }) => (
                    <li key={account.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                      <span className="flex items-center gap-2 truncate">
                        {account.type === 'investment' ? <Landmark className="h-3.5 w-3.5" /> : <Wallet className="h-3.5 w-3.5" />}
                        {account.name}
                      </span>
                      <Money value={balance} className="font-medium" />
                    </li>
                  ))}
                  {portfolio > 0 ? (
                    <li className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                      <span className="flex items-center gap-2">
                        <Landmark className="h-3.5 w-3.5" />
                        Carteira de investimentos ({investments.length} ativo(s))
                      </span>
                      <Money value={portfolio} className="font-medium" />
                    </li>
                  ) : null}
                </ul>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Passivos</p>
                {balances.liabilities.length === 0 && debtSummary.outstanding === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum passivo registrado.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {balances.liabilities.map(({ account, balance }) => (
                      <li key={account.id} className="flex items-center justify-between gap-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-3.5 w-3.5" />
                          Fatura {account.name}
                        </span>
                        <Money value={balance} className="font-medium" />
                      </li>
                    ))}
                    {debtSummary.outstanding > 0 ? (
                      <li className="flex items-center justify-between gap-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-3.5 w-3.5" />
                          Dívidas cadastradas ({debtSummary.count})
                        </span>
                        <Money value={debtSummary.outstanding} className="font-medium" />
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>

              <p className="flex items-start gap-2 rounded-xl border border-border/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
                <ArrowLeftRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Transferências entre contas próprias não entram em receitas nem despesas — no mês, foram{' '}
                <Money value={summary.current.transferVolume} /> movimentados internamente.
              </p>
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <EquityChart accounts={accounts} transactions={transactions} investments={investments} />
          <StatCard
            label="Compromissos dos próximos 30 dias"
            value={<Money value={commitments.total} />}
            hint={`${commitments.count} pendência(s) incluídas apenas nas projeções.`}
            tone="amber"
          />
        </div>
      </div>

      <ProjectionPanel projection={projection} />

      <FlowChart transactions={filterTransactions(transactions, { environment: 'consolidado' })} months={6} />

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        As operações da carteira ({operations.length}) alimentam a rentabilidade de cada ativo no ambiente de investimentos.
      </p>
    </div>
  );
}