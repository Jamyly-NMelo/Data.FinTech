/** Precificação: margem, markup, ponto de equilíbrio e preço sugerido. */

import { percent, round2, toNumber } from './money.js';

export const pricingAnalysis = (input = {}) => {
  const variableCost = toNumber(input.variable_cost);
  const fixedCost = toNumber(input.fixed_cost_monthly);
  const taxPercent = toNumber(input.tax_percent);
  const commissionPercent = toNumber(input.commission_percent);
  const desiredMarginPercent = toNumber(input.desired_margin_percent);
  const units = toNumber(input.expected_monthly_units);
  const currentPrice = toNumber(input.current_price);
  const alerts = [];

  const deductionPercent = round2(taxPercent + commissionPercent);
  if (deductionPercent >= 100) {
    alerts.push('Impostos + comissão somam 100% ou mais do preço: não existe preço possível com essas premissas.');
  }
  if (desiredMarginPercent < 0) alerts.push('A margem desejada não pode ser negativa.');

  const denominator = round2((100 - desiredMarginPercent - deductionPercent) / 100);
  const unitCost = round2(variableCost + (units > 0 ? fixedCost / units : 0));
  let suggestedPrice = null;
  if (denominator <= 0) {
    alerts.push('Margem desejada + impostos + comissão alcançam 100% ou mais do preço. Revise as premissas.');
  } else {
    suggestedPrice = round2(unitCost / denominator);
  }

  if (units <= 0 && fixedCost > 0) {
    alerts.push('Sem volume esperado, o custo fixo não é distribuído por unidade.');
  }

  const price = currentPrice > 0 ? currentPrice : suggestedPrice || 0;
  const unitTaxAndCommission = round2((price * deductionPercent) / 100);
  const contributionMargin = round2(price - variableCost - unitTaxAndCommission);
  const marginPercent = price > 0 ? round2(percent(contributionMargin, price)) : 0;
  const markupPercent = variableCost > 0 ? round2((price / variableCost - 1) * 100) : null;
  const breakEvenUnits = contributionMargin > 0 ? Math.ceil(fixedCost / contributionMargin) : null;
  const monthlyRevenue = round2(price * units);
  const monthlyProfit = round2(contributionMargin * units - fixedCost);

  if (price > 0 && contributionMargin <= 0) {
    alerts.push('A margem de contribuição por unidade é negativa: cada venda aumenta o prejuízo.');
  }
  if (fixedCost > 0 && breakEvenUnits === null && price > 0) {
    alerts.push('Não é possível calcular o ponto de equilíbrio com margem de contribuição não positiva.');
  }

  return {
    price,
    suggestedPrice,
    unitCost,
    variableCost,
    fixedCost,
    deductionPercent,
    unitTaxAndCommission,
    contributionMargin,
    marginPercent,
    markupPercent,
    breakEvenUnits,
    breakEvenRevenue: breakEvenUnits !== null ? round2(breakEvenUnits * price) : null,
    monthlyRevenue,
    monthlyProfit,
    monthlyProfitPercent: monthlyRevenue > 0 ? round2(percent(monthlyProfit, monthlyRevenue)) : 0,
    alerts,
    valid: denominator > 0 && deductionPercent < 100,
  };
};