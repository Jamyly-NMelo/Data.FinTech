/**
 * Conjuntos de categorias iniciais por ambiente.
 *
 * Regras
 *  - Cada item usa apenas campos que já existem no modelo Category: name, kind, group, environment.
 *  - O grupo contábil é explícito (não depende de palavras no nome) para o DRE funcionar.
 *  - A comparação de duplicidade ignora acentos, caixa e espaços extras.
 *  - Nada aqui apaga, renomeia ou reclassifica categorias existentes.
 */

export const DEFAULT_CATEGORY_SETS = Object.freeze({
  pf: [
    { key: 'pf-salario', name: 'Salário', kind: 'income', group: 'receita' },
    { key: 'pf-outras-receitas', name: 'Outras receitas', kind: 'income', group: 'receita' },
    { key: 'pf-rendimentos', name: 'Rendimentos de investimentos', kind: 'income', group: 'receita' },
    { key: 'pf-moradia', name: 'Moradia', kind: 'expense', group: 'operacional' },
    { key: 'pf-alimentacao', name: 'Alimentação', kind: 'expense', group: 'operacional' },
    { key: 'pf-transporte', name: 'Transporte', kind: 'expense', group: 'operacional' },
    { key: 'pf-saude', name: 'Saúde', kind: 'expense', group: 'operacional' },
    { key: 'pf-educacao', name: 'Educação', kind: 'expense', group: 'operacional' },
    { key: 'pf-lazer', name: 'Lazer', kind: 'expense', group: 'operacional' },
    { key: 'pf-contas-domesticas', name: 'Contas domésticas', kind: 'expense', group: 'operacional' },
    { key: 'pf-dividas', name: 'Dívidas e encargos', kind: 'expense', group: 'financeiro' },
    { key: 'pf-impostos', name: 'Impostos e taxas', kind: 'expense', group: 'impostos' },
  ],
  pj: [
    { key: 'pj-receita-vendas', name: 'Receita de vendas', kind: 'income', group: 'receita' },
    { key: 'pj-prestacao-servicos', name: 'Prestação de serviços', kind: 'income', group: 'receita' },
    { key: 'pj-custos-variaveis', name: 'Custos variáveis', kind: 'expense', group: 'custos' },
    { key: 'pj-insumos', name: 'Insumos', kind: 'expense', group: 'custos' },
    { key: 'pj-despesas-operacionais', name: 'Despesas operacionais', kind: 'expense', group: 'operacional' },
    { key: 'pj-aluguel', name: 'Aluguel', kind: 'expense', group: 'operacional' },
    { key: 'pj-folha', name: 'Folha de pagamento', kind: 'expense', group: 'pessoal' },
    { key: 'pj-prolabore', name: 'Pró-labore do titular', kind: 'expense', group: 'prolabore' },
    { key: 'pj-impostos', name: 'Impostos', kind: 'expense', group: 'impostos' },
    { key: 'pj-das', name: 'DAS / Simples Nacional', kind: 'expense', group: 'impostos' },
    { key: 'pj-tarifas', name: 'Tarifas bancárias e de cartão', kind: 'expense', group: 'financeiro' },
  ],
  invest: [
    { key: 'invest-rendimentos', name: 'Rendimentos e proventos', kind: 'income', group: 'receita' },
    { key: 'invest-taxas', name: 'Taxas e corretagem', kind: 'expense', group: 'financeiro' },
    { key: 'invest-impostos', name: 'Impostos sobre investimentos', kind: 'expense', group: 'impostos' },
  ],
});

/** O que já existe no modelo e por isso não vira categoria de lançamento. */
export const DEFAULT_CATEGORY_NOTES = Object.freeze({
  pf: ['Transferências internas são um tipo de lançamento (não uma categoria) e já ficam fora do resultado.'],
  pj: [
    'Disponibilidades, ativo circulante e passivo circulante são apurados pelos tipos de conta e pelas pendências — não são categorias de lançamento.',
    'Aportes em investimentos usam o tipo de lançamento transferência, quando saem de uma conta para outra.',
  ],
  invest: [
    'Aportes, resgates, rendimentos e proventos já existem como tipos de operação de investimento.',
    'Transferências entre corretora e banco usam o tipo de lançamento transferência e não entram como receita ou despesa.',
  ],
});

export const normalizeCategoryName = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Compara o conjunto sugerido com as categorias reais do usuário.
 * `exists` marca o que já está cadastrado naquele ambiente.
 */
export const defaultCategoryPlan = ({ environment = 'pf', existingCategories = [] } = {}) => {
  const set = DEFAULT_CATEGORY_SETS[environment] || [];
  const taken = new Set(
    existingCategories
      .filter((category) => category.environment === environment)
      .map((category) => normalizeCategoryName(category.name)),
  );
  return set.map((item) => ({ ...item, exists: taken.has(normalizeCategoryName(item.name)) }));
};

/** Somente o que será realmente criado (nunca inclui o que já existe). */
export const pendingDefaultCategories = (plan = [], selectedKeys = null) =>
  plan.filter((item) => !item.exists && (!selectedKeys || selectedKeys.includes(item.key)));

/** Payload aceito pelo modelo Category, vinculado ao ambiente escolhido. */
export const buildCategoryPayload = (items = [], environment) =>
  items.map((item) => ({ name: item.name, kind: item.kind, group: item.group, environment }));