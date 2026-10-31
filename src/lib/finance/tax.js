/**
 * Simulador tributário (ambiente PJ).
 *
 * IMPORTANTE: este módulo produz HIPÓTESES de cálculo a partir de premissas
 * editáveis e de alíquotas de referência. Não representa obrigação legal
 * apurada, não substitui a contabilidade oficial e deve ser revisado por um
 * profissional antes de qualquer decisão.
 */

import { percent, round2, toNumber } from './money.js';

export const TAX_DISCLAIMER =
  'Simulação com premissas editáveis e alíquotas de referência. Não é apuração oficial nem constitui obrigação tributária — confirme com sua contabilidade.';

export const REGIMES = [
  { value: 'mei', label: 'MEI' },
  { value: 'simples', label: 'Simples Nacional' },
  { value: 'presumido', label: 'Lucro Presumido' },
  { value: 'real', label: 'Lucro Real' },
];

export const ACTIVITIES = [
  { value: 'comercio', label: 'Comércio' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'industria', label: 'Indústria' },
  { value: 'misto', label: 'Misto' },
];

export const ANNEXES = [
  { value: 'I', label: 'Anexo I — Comércio' },
  { value: 'III', label: 'Anexo III — Serviços' },
  { value: 'V', label: 'Anexo V — Serviços (fator R baixo)' },
];

/** Faixas [limite RBT12, alíquota nominal %, dedução R$]. */
const SIMPLES_TABLES = {
  I: [
    [180000, 4, 0],
    [360000, 7.3, 5940],
    [720000, 9.5, 13860],
    [1800000, 10.7, 22500],
    [3600000, 14.3, 87300],
    [4800000, 19, 378000],
  ],
  III: [
    [180000, 6, 0],
    [360000, 11.2, 9360],
    [720000, 13.5, 17640],
    [1800000, 16, 35640],
    [3600000, 21, 125640],
    [4800000, 33, 648000],
  ],
  V: [
    [180000, 15.5, 0],
    [360000, 18, 4500],
    [720000, 19.5, 9900],
    [1800000, 20.5, 17100],
    [3600000, 23, 62100],
    [4800000, 30.5, 540000],
  ],
};

export const simplesFaixa = (annex, rbt12) => {
  const table = SIMPLES_TABLES[annex] || SIMPLES_TABLES.III;
  const revenue = toNumber(rbt12);
  if (revenue <= 0) return { index: 0, nominal: table[0][1], deduction: table[0][2], limit: table[0][0] };
  const index = table.findIndex(([limit]) => revenue <= limit);
  if (index === -1) return { index: table.length, nominal: null, deduction: null, limit: table[table.length - 1][0], overLimit: true };
  const [limit, nominal, deduction] = table[index];
  return { index: index + 1, nominal, deduction, limit, overLimit: false };
};

export const estimateSimples = ({ monthly_revenue, annual_revenue, service_annex = 'III', activity = 'servicos' } = {}) => {
  const monthly = toNumber(monthly_revenue);
  const rbt12 = toNumber(annual_revenue) > 0 ? toNumber(annual_revenue) : round2(monthly * 12);
  const annex = activity === 'servicos' ? service_annex || 'III' : 'I';
  const faixa = simplesFaixa(annex, rbt12);
  const notes = [`Alíquotas de referência do Simples Nacional (${annex === 'I' ? 'Anexo I' : `Anexo ${annex}`}).`];

  if (rbt12 <= 0) {
    notes.push('Informe a receita anual (RBT12) para calcular a alíquota efetiva.');
    return { regime: 'simples', annex, effectiveRate: 0, monthlyTax: 0, annualTax: 0, faixa: null, notes, insufficient: true };
  }
  if (faixa.overLimit) {
    notes.push('Receita acima do limite do Simples Nacional — o regime não se aplica.');
    return { regime: 'simples', annex, effectiveRate: null, monthlyTax: null, annualTax: null, faixa, notes, notApplicable: true };
  }

  const effectiveRate = round2(((rbt12 * faixa.nominal) / 100 - faixa.deduction) / rbt12 * 100);
  const monthlyTax = round2((monthly * effectiveRate) / 100);
  notes.push(`Faixa ${faixa.index} (nominal ${faixa.nominal}% com dedução de ${faixa.deduction}).`);

  return { regime: 'simples', annex, effectiveRate, monthlyTax, annualTax: round2(monthlyTax * 12), faixa, notes };
};

export const estimatePresumido = ({ monthly_revenue, activity = 'servicos', iss_percent = 5 } = {}) => {
  const monthly = toNumber(monthly_revenue);
  const isService = activity === 'servicos' || activity === 'misto';
  const irpjBasePercent = isService ? 32 : 8;
  const csllBasePercent = isService ? 32 : 12;

  const irpjBase = round2((monthly * irpjBasePercent) / 100);
  const csllBase = round2((monthly * csllBasePercent) / 100);
  const irpj = round2(irpjBase * 0.15);
  const adicional = round2(Math.max(0, irpjBase - 20000) * 0.1);
  const csll = round2(csllBase * 0.09);
  const pisCofins = round2(monthly * 0.0365);
  const iss = isService ? round2((monthly * toNumber(iss_percent)) / 100) : 0;
  const total = round2(irpj + adicional + csll + pisCofins + iss);

  return {
    regime: 'presumido',
    monthlyTax: total,
    annualTax: round2(total * 12),
    effectiveRate: monthly > 0 ? round2(percent(total, monthly)) : 0,
    breakdown: [
      { label: `IRPJ (15% sobre ${irpjBasePercent}% da receita)`, value: irpj },
      { label: 'Adicional de IRPJ (10% acima de R$ 20.000/mês)', value: adicional },
      { label: `CSLL (9% sobre ${csllBasePercent}% da receita)`, value: csll },
      { label: 'PIS/COFINS cumulativo (3,65%)', value: pisCofins },
      { label: isService ? `ISS (${toNumber(iss_percent)}%)` : 'ICMS (não estimado nesta hipótese)', value: iss },
    ],
    notes: ['Hipótese de Lucro Presumido com percentuais de presunção de referência. ICMS e créditos não são estimados.'],
  };
};

export const estimateReal = ({ monthly_revenue, profit_margin_percent = 20 } = {}) => {
  const monthly = toNumber(monthly_revenue);
  const profit = round2((monthly * toNumber(profit_margin_percent)) / 100);
  const irpj = round2(Math.max(0, profit) * 0.15);
  const adicional = round2(Math.max(0, Math.max(0, profit) - 20000) * 0.1);
  const csll = round2(Math.max(0, profit) * 0.09);
  const pisCofins = round2(monthly * 0.0925);
  const total = round2(irpj + adicional + csll + pisCofins);

  return {
    regime: 'real',
    monthlyTax: total,
    annualTax: round2(total * 12),
    effectiveRate: monthly > 0 ? round2(percent(total, monthly)) : 0,
    breakdown: [
      { label: 'IRPJ (15% do lucro real)', value: irpj },
      { label: 'Adicional de IRPJ (10% acima de R$ 20.000/mês)', value: adicional },
      { label: 'CSLL (9% do lucro real)', value: csll },
      { label: 'PIS/COFINS não cumulativo (9,25%, sem créditos)', value: pisCofins },
    ],
    notes: ['Hipótese a partir da margem de lucro informada. Créditos de PIS/COFINS não são considerados.'],
  };
};

export const estimateMei = ({ mei_das = 76 } = {}) => {
  const monthlyTax = round2(toNumber(mei_das));
  return {
    regime: 'mei',
    monthlyTax,
    annualTax: round2(monthlyTax * 12),
    effectiveRate: null,
    breakdown: [{ label: 'DAS-MEI (valor fixo mensal)', value: monthlyTax }],
    notes: ['Valor de DAS informado como premissa; não depende do faturamento dentro do limite do MEI.'],
  };
};

/** Compara os regimes aplicáveis e indica o menor custo estimado. */
export const compareRegimes = (scenario = {}) => {
  const estimates = [
    estimateMei(scenario),
    estimateSimples(scenario),
    estimatePresumido(scenario),
    estimateReal(scenario),
  ].filter((estimate) => !estimate.notApplicable && estimate.monthlyTax !== null);

  const applicable = estimates.filter((estimate) => !estimate.insufficient);
  const best = applicable.length
    ? applicable.reduce((winner, estimate) => (estimate.monthlyTax < winner.monthlyTax ? estimate : winner), applicable[0])
    : null;

  return {
    estimates,
    best: best?.regime || null,
    bestLabel: REGIMES.find((regime) => regime.value === best?.regime)?.label || null,
    disclaimer: TAX_DISCLAIMER,
    hasData: toNumber(scenario.monthly_revenue) > 0,
  };
};