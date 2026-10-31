/** DRE simplificado (ambiente PJ) a partir dos lançamentos liquidados. */

import { percent, round2 } from './money.js';
import { isCancelled, isTransfer, realizedDate, settledAmount } from './ledger.js';
import { inRange } from './periods.js';

export const DRE_GROUPS = ['receita', 'custos', 'operacional', 'pessoal', 'prolabore', 'financeiro', 'impostos', 'nao_classificado'];

export const GROUP_LABELS = {
  receita: 'Receitas',
  custos: 'Custos variáveis',
  operacional: 'Despesas operacionais',
  pessoal: 'Despesas com pessoal',
  prolabore: 'Pró-labore',
  financeiro: 'Despesas financeiras',
  impostos: 'Impostos',
  patrimonio: 'Movimentações patrimoniais',
  nao_classificado: 'Não classificado',
};

export const buildDre = ({ transactions = [], categories = [], range = null, environment = 'pj' } = {}) => {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const warnings = [];
  let unclassified = 0;
  let missingCategory = 0;
  let outsideEnvironment = 0;

  const totals = {};
  DRE_GROUPS.forEach((group) => {
    totals[group] = 0;
  });

  transactions.forEach((tx) => {
    if (isCancelled(tx) || isTransfer(tx)) return;
    if (amountIsEmpty(tx)) return;
    if (environment && environment !== 'consolidado' && tx.environment !== environment) {
      outsideEnvironment += 1;
      return;
    }
    if (range && (range.from || range.to) && !inRange(realizedDate(tx), range)) return;

    const amount = settledAmount(tx);
    if (tx.kind === 'income') {
      totals.receita = round2(totals.receita + amount);
      return;
    }

    const category = tx.category_id ? byId.get(tx.category_id) : null;
    if (tx.category_id && !category) {
      missingCategory += 1;
      totals.nao_classificado = round2(totals.nao_classificado + amount);
      return;
    }
    const group = category && DRE_GROUPS.includes(category.group) && category.group !== 'receita'
      ? category.group
      : 'nao_classificado';
    if (group === 'nao_classificado') unclassified += 1;
    if (group === 'patrimonio') return;
    totals[group] = round2(totals[group] + amount);
  });

  const margem = round2(totals.receita - totals.custos);
  const resultadoOperacional = round2(margem - totals.operacional);
  const resultadoAntesProlabore = round2(
    resultadoOperacional - totals.pessoal - totals.financeiro - totals.impostos - totals.nao_classificado,
  );
  const liquido = round2(resultadoAntesProlabore - totals.prolabore);

  if (missingCategory > 0) warnings.push(`${missingCategory} lançamento(s) apontam para categorias inexistentes e ficaram como "Não classificado".`);
  if (unclassified > 0) warnings.push(`${unclassified} lançamento(s) sem classificação contábil definida.`);
  if (outsideEnvironment > 0) warnings.push(`${outsideEnvironment} lançamento(s) fora do contexto selecionado foram ignorados.`);

  const lines = [
    { key: 'receita', label: 'Receita bruta', amount: totals.receita, type: 'revenue' },
    { key: 'custos', label: '(−) Custos variáveis', amount: round2(-totals.custos), type: 'cost' },
    { key: 'margem_contribuicao', label: '= Margem de contribuição', amount: margem, type: 'subtotal', share: percent(margem, totals.receita) },
    { key: 'operacional', label: '(−) Despesas operacionais', amount: round2(-totals.operacional), type: 'cost' },
    { key: 'resultado_operacional', label: '= Resultado operacional', amount: resultadoOperacional, type: 'subtotal', share: percent(resultadoOperacional, totals.receita) },
    { key: 'pessoal', label: '(−) Despesas com pessoal', amount: round2(-totals.pessoal), type: 'cost' },
    { key: 'prolabore', label: '(−) Pró-labore', amount: round2(-totals.prolabore), type: 'cost' },
    { key: 'financeiro', label: '(−) Despesas financeiras', amount: round2(-totals.financeiro), type: 'cost' },
    { key: 'impostos', label: '(−) Impostos', amount: round2(-totals.impostos), type: 'cost' },
    { key: 'nao_classificado', label: '(−) Não classificado', amount: round2(-totals.nao_classificado), type: 'cost' },
    { key: 'resultado_liquido', label: '= Resultado líquido', amount: liquido, type: 'total', share: percent(liquido, totals.receita) },
  ];

  return {
    lines: lines.filter((line) => line.type !== 'cost' || line.amount !== 0),
    totals,
    margemContribuicao: margem,
    resultadoOperacional,
    resultadoLiquido: liquido,
    margemPercent: percent(margem, totals.receita),
    margemOperacionalPercent: percent(resultadoOperacional, totals.receita),
    margemLiquidaPercent: percent(liquido, totals.receita),
    warnings,
    hasData: totals.receita !== 0 || totals.custos !== 0 || totals.operacional !== 0,
  };
};

const amountIsEmpty = (tx) => settledAmount(tx) <= 0;