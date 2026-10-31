import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import FilterBar, { DEFAULT_FILTERS } from '@/components/common/FilterBar';
import StatCard from '@/components/common/StatCard';
import Money from '@/components/common/Money';
import EmptyState from '@/components/common/EmptyState';
import FlowChart from '@/components/dashboard/FlowChart';
import CategoryChart from '@/components/dashboard/CategoryChart';
import EquityChart from '@/components/dashboard/EquityChart';
import AgendaPanel from '@/components/dashboard/AgendaPanel';
import ProjectionPanel from '@/components/dashboard/ProjectionPanel';
import LiquidityPanel from '@/components/pj/LiquidityPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/lib/workspace';
import { usePreferences } from '@/lib/preferences';
import {
  ENVIRONMENTS,
  cashProjection,
  filterTransactions,
  financialAutonomy,
  liquidBalance,
  netWorth,
  periodSummary,
  upcomingAgenda,
  upcomingCommitments,
  withinRange,
  realizedRows,
} from '@/lib/finance/metrics';
import { inRange, previousRange, resolveRange } from '@/lib/finance/periods';
import { operationAmount, portfolioSummary } from '@/lib/finance/investments';
import { debtTotals } from '@/lib/finance/debt';
import { formatNumber, formatPercent } from '@/lib/format';
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarClock,
  Gauge,
  Landmark,
  PiggyBank,
  Scale,
  TrendingUp,
  Wallet,
} from 'lucide-react';

export default function Dashboard() {
  const { environment, preferences } = usePreferences();
  const { accounts, categories, transactions, investments, operations, debts } = useWorkspace();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const range = useMemo(() => resolveRange(filters.period, { from: filters.from, to: filters.to }), [filters]);
  const previous = useMemo(() => previousRange(range), [range]);

  const scopeFilters = {
    environment,
    accountId: filters.accountId,
    categoryId: filters.categoryId,
  };

  const chartScope = useMemo(
    () => filterTransactions(transactions, { ...scopeFilters, status: 'all' }),
    [transactions, environment, filters.accountId, filters.categoryId],
  );

  const periodScope = useMemo(
    () => filterTransactions(transactions, { ...scopeFilters, status: filters.status }),
    [transactions, environment, filters.accountId, filters.categoryId, filters.status],
  );

  const accountsInScope = useMemo(
    () =>
      accounts.filter(
        (account) =>
          (environment === 'consolidado' || account.environment === environment) &&
          (filters.accountId === 'all' || account.id === filters.accountId),
      ),
    [accounts, environment, filters.accountId],
  );

  const investmentsInScope = useMemo(() => {
    if (environment === 'consolidado') return investments;
    if (environment === 'pj') return investments.filter((investment) => investment.environment === 'pj');
    if (environment === 'pf') return investments.filter((investment) => investment.environment === 'pf');
    return investments;
  }, [investments, environment]);

  const summary = useMemo(() => periodSummary(periodScope, range, previous), [periodScope, range, previous]);
  const liquid = useMemo(() => liquidBalance(accountsInScope, transactions), [accountsInScope, transactions]);
  const autonomy = useMemo(() => financialAutonomy(liquid, transactions, 3), [liquid, transactions]);
  const commitments = useMemo(() => upcomingCommitments(transactions, { days: 30 }), [transactions]);
  const agenda = useMemo(
    () => upcomingAgenda(transactions, { days: preferences.agenda_days || 10 }),
    [transactions, preferences.agenda_days],
  );
  const position = useMemo(
    () => netWorth(accountsInScope, transactions, investmentsInScope),
    [accountsInScope, transactions, investmentsInScope],
  );
  const portfolio = useMemo(() => portfolioSummary(investmentsInScope, operations), [investmentsInScope, operations]);
  const debtsInScope = useMemo(
    () => (environment === 'consolidado' ? debts : debts.filter((debt) => debt.environment === environment)),
    [debts, environment],
  );
  const debtSummary = useMemo(() => debtTotals(debtsInScope), [debtsInScope]);
  const earningsInPeriod = useMemo(
    () =>
      operations
        .filter((operation) => ['dividendo', 'jcp', 'rendimento'].includes(operation.type))
        .filter((operation) => inRange(operation.date, range))
        .reduce((total, operation) => total + operationAmount(operation), 0),
    [operations, range],
  );
  const projection = useMemo(
    () => cashProjection(accountsInScope, transactions, { months: Math.min(preferences.projection_months || 12, 12) }),
    [accountsInScope, transactions, preferences.projection_months],
  );

  const realizedInPeriod = useMemo(() => withinRange(realizedRows(chartScope), range), [chartScope, range]);
  const environmentLabel = ENVIRONMENTS.find((item) => item.value === environment)?.label || 'Finanças Pessoais';

  const kpis = useMemo(() => {
    const base = [];
    if (environment === 'invest') {
      base.push(
        {
          key: 'portfolio',
          label: 'Valor da carteira',
          value: <Money value={portfolio.value} />,
          hint: `${investmentsInScope.length} posição(ões) com cotação cadastrada.`,
          icon: TrendingUp,
          tone: 'mint',
        },
        {
          key: 'profitability',
          label: 'Rentabilidade',
          value: formatPercent(portfolio.profitabilityPercent, 2),
          hint: (
            <span>
              Resultado de <Money value={portfolio.result} /> sobre o valor aportado.
            </span>
          ),
          icon: Gauge,
          tone: portfolio.result >= 0 ? 'mint' : 'danger',
        },
        {
          key: 'earnings',
          label: 'Proventos no período',
          value: <Money value={earningsInPeriod} />,
          hint: 'Dividendos, JCP e rendimentos registrados nas operações.',
          icon: Landmark,
          tone: 'amber',
        },
        {
          key: 'brokerage',
          label: 'Caixa em corretoras',
          value: <Money value={position.brokerageCash} />,
          hint: 'Saldo líquido das contas do tipo investimento.',
          icon: Wallet,
          tone: 'navy',
        },
      );
    } else if (environment === 'consolidado') {
      base.push(
        {
          key: 'equity',
          label: 'Patrimônio líquido',
          value: <Money value={position.equity} />,
          hint: (
            <span>
              Ativos <Money value={position.assets} /> · Passivos <Money value={position.liabilities} />
            </span>
          ),
          icon: Scale,
          tone: 'navy',
        },
        {
          key: 'cash',
          label: 'Caixa disponível',
          value: <Money value={position.cash} />,
          hint: 'Contas correntes, poupança e dinheiro em espécie.',
          icon: Wallet,
          tone: 'mint',
        },
        {
          key: 'result',
          label: 'Resultado do período',
          value: <Money value={summary.current.result} colored />,
          delta: summary.comparison?.result,
          deltaLabel: `vs. ${previous?.label?.toLowerCase() || 'período anterior'}`,
          hint: 'Transferências internas já excluídas do resultado.',
          icon: summary.current.result >= 0 ? ArrowUpRight : ArrowDownRight,
          tone: summary.current.result >= 0 ? 'mint' : 'danger',
        },
        {
          key: 'commitments',
          label: 'Compromissos futuros',
          value: <Money value={commitments.total} />,
          hint: `${commitments.count} pendência(s) nos próximos 30 dias, sem transferências.`,
          icon: CalendarClock,
          tone: 'amber',
        },
      );
    } else {
      base.push(
        {
          key: 'income',
          label: 'Receitas do período',
          value: <Money value={summary.current.income} />,
          delta: summary.comparison?.income,
          deltaLabel: `vs. ${previous?.label?.toLowerCase() || 'período anterior'}`,
          icon: ArrowUpRight,
          tone: 'mint',
        },
        {
          key: 'expense',
          label: 'Despesas do período',
          value: <Money value={summary.current.expense} />,
          delta: summary.comparison?.expense,
          invertDelta: true,
          deltaLabel: `vs. ${previous?.label?.toLowerCase() || 'período anterior'}`,
          icon: ArrowDownRight,
          tone: 'amber',
        },
        {
          key: 'result',
          label: 'Resultado',
          value: <Money value={summary.current.result} colored />,
          delta: summary.comparison?.result,
          deltaLabel: `vs. ${previous?.label?.toLowerCase() || 'período anterior'}`,
          hint: `Margem de ${formatPercent(summary.current.margin, 1)} sobre as receitas.`,
          icon: summary.current.result >= 0 ? ArrowUpRight : ArrowDownRight,
          tone: summary.current.result >= 0 ? 'mint' : 'danger',
        },
        {
          key: 'liquid',
          label: 'Saldo disponível',
          value: <Money value={liquid} />,
          hint:
            autonomy.months === null
              ? 'Sem despesas liquidadas nos últimos 3 meses para calcular autonomia.'
              : `Autonomia de ${formatNumber(autonomy.months, { decimals: 1 })} meses ao ritmo atual.`,
          icon: Wallet,
          tone: 'navy',
        },
      );
    }
    return base;
  }, [environment, portfolio, investmentsInScope, position, summary, previous, liquid, autonomy, commitments, earningsInPeriod]);

  const hasAccounts = accountsInScope.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel"
        description={`${environmentLabel} · indicadores derivados dos seus lançamentos reais. Passe o mouse nos cartões para ver como cada número é formado.`}
        badge={
          <Badge variant="outline" className="text-[11px]">
            {range.label}
          </Badge>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/lancamentos">
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Lançamentos
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/lancamentos?novo=1">
                <PiggyBank className="mr-2 h-4 w-4" />
                Novo lançamento
              </Link>
            </Button>
          </>
        }
      />

      <FilterBar filters={filters} onChange={setFilters} accounts={accounts} categories={categories} />

      {!hasAccounts ? (
        <EmptyState
          icon={Wallet}
          title="Comece cadastrando sua primeira conta"
          description="Os saldos são calculados exclusivamente com movimentos liquidados. Cadastre contas e cartões do ambiente ativo para ver os indicadores."
          action={
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button asChild size="sm">
                <Link to="/contas">Cadastrar conta</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/lancamentos?novo=1">Registrar lançamento</Link>
              </Button>
            </div>
          }
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.key}
            label={kpi.label}
            value={kpi.value}
            hint={kpi.hint}
            delta={kpi.delta}
            invertDelta={kpi.invertDelta}
            deltaLabel={kpi.deltaLabel}
            icon={kpi.icon}
            tone={kpi.tone}
          />
        ))}
      </div>

      {environment === 'pj' ? (
        <LiquidityPanel accounts={accounts} transactions={transactions} range={range} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <FlowChart transactions={chartScope} months={range.key === 'last_12_months' ? 12 : 6} />
        <CategoryChart transactions={realizedInPeriod} categories={categories} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AgendaPanel agenda={agenda} days={preferences.agenda_days || 10} />
        {environment === 'consolidado' ? (
          <ProjectionPanel projection={projection} />
        ) : (
          <div className="space-y-4">
            <StatCard
              label="Passivos e dívidas"
              value={<Money value={debtSummary.outstanding + position.liabilities} />}
              hint={`${debtSummary.count} dívida(s) cadastrada(s) e faturas em aberto no ambiente.`}
              icon={Scale}
              tone={debtSummary.outstanding + position.liabilities > 0 ? 'danger' : 'mint'}
            />
            <EquityChart accounts={accountsInScope} transactions={transactions} investments={investmentsInScope} />
          </div>
        )}
      </div>

      {environment === 'consolidado' ? (
        <EquityChart accounts={accounts} transactions={transactions} investments={investments} />
      ) : null}
    </div>
  );
}