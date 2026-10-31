/** Gestão de dívidas: saldo, comprometimento de renda e prazo de quitação. */

import { percent, round2, toNumber } from './money.js';
import { KIND, isCancelled, isTransfer, openAmount, settledAmount } from './ledger.js';

export const monthlyRate = (annualPercent) => toNumber(annualPercent) / 100 / 12;

export const debtTotals = (debts = []) => {
  const outstanding = round2(debts.reduce((total, debt) => total + toNumber(debt.outstanding_balance), 0));
  const principal = round2(debts.reduce((total, debt) => total + toNumber(debt.principal), 0));
  const installments = round2(debts.reduce((total, debt) => total + toNumber(debt.installment_amount), 0));
  const weighted = debts.reduce(
    (total, debt) => total + toNumber(debt.annual_interest_rate) * toNumber(debt.outstanding_balance),
    0,
  );
  return {
    outstanding,
    principal,
    installments,
    avgRate: outstanding > 0 ? round2(weighted / outstanding) : 0,
    paid: round2(principal - outstanding > 0 ? principal - outstanding : 0),
    count: debts.length,
  };
};

/**
 * Simulação de quitação. Retorna `impossible` quando a parcela não cobre os juros.
 */
export const payoffSchedule = ({
  outstanding_balance,
  annual_interest_rate,
  installment_amount,
  maxMonths = 600,
} = {}) => {
  const initial = round2(toNumber(outstanding_balance));
  const rate = monthlyRate(annual_interest_rate);
  const payment = round2(toNumber(installment_amount));

  if (initial <= 0) return { months: 0, totalInterest: 0, totalPaid: 0, schedule: [], impossible: false, settled: true };
  if (payment <= 0) {
    return {
      impossible: true,
      months: null,
      totalInterest: null,
      totalPaid: null,
      schedule: [],
      reason: 'Informe o valor da parcela para simular a quitação.',
    };
  }

  const firstInterest = round2(initial * rate);
  if (payment <= firstInterest) {
    return {
      impossible: true,
      months: null,
      totalInterest: null,
      totalPaid: null,
      schedule: [],
      firstInterest,
      reason: 'A parcela não cobre os juros mensais — nesse cenário a dívida não é quitada. Revise a parcela ou a taxa.',
    };
  }

  let balance = initial;
  let totalInterest = 0;
  let totalPaid = 0;
  const schedule = [];

  while (balance > 0.005 && schedule.length < maxMonths) {
    const interest = round2(balance * rate);
    let amortization = round2(payment - interest);
    let paid = payment;
    if (amortization >= balance) {
      amortization = balance;
      paid = round2(balance + interest);
    }
    balance = round2(balance - amortization);
    totalInterest = round2(totalInterest + interest);
    totalPaid = round2(totalPaid + paid);
    schedule.push({ period: schedule.length + 1, interest, amortization, payment: paid, balance });
  }

  return {
    impossible: false,
    months: schedule.length,
    totalInterest,
    totalPaid,
    schedule,
    payoff_date: null,
  };
};

export const incomeCommitment = (installments, monthlyIncome) =>
  toNumber(monthlyIncome) > 0 ? round2(percent(installments, monthlyIncome)) : null;

/** Dívidas com juros já projetados e prazo estimado. */
export const debtProjection = (debts = []) =>
  debts
    .map((debt) => {
      const simulation = payoffSchedule(debt);
      return { debt, simulation };
    })
    .sort((a, b) => toNumber(b.debt.outstanding_balance) - toNumber(a.debt.outstanding_balance));

/** Parcelas de dívidas que ainda aparecem como pendência nos lançamentos. */
export const pendingDebtPayments = (transactions = []) =>
  transactions.filter((tx) => !isCancelled(tx) && !isTransfer(tx) && tx.kind === KIND.EXPENSE && openAmount(tx) > 0);

export const debtPaymentsSettled = (transactions = []) =>
  round2(
    transactions
      .filter((tx) => !isCancelled(tx) && !isTransfer(tx) && tx.kind === KIND.EXPENSE && tx.category_id === 'dividas')
      .reduce((total, tx) => total + settledAmount(tx), 0),
  );