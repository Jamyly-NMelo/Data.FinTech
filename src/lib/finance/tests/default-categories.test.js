/**
 * Testes das categorias padrão por ambiente.
 * Execução: node --test src/lib/finance/tests/default-categories.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CATEGORY_SETS,
  buildCategoryPayload,
  defaultCategoryPlan,
  normalizeCategoryName,
  pendingDefaultCategories,
} from '../defaultCategories.js';
import { DRE_GROUPS } from '../dre.js';

test('cada conjunto usa apenas grupos aceitos pelo DRE e campos do modelo', () => {
  Object.values(DEFAULT_CATEGORY_SETS).forEach((set) => {
    set.forEach((item) => {
      assert.ok(['income', 'expense'].includes(item.kind), `${item.name} precisa de kind válido`);
      assert.ok(DRE_GROUPS.includes(item.group), `${item.name} usa grupo inválido: ${item.group}`);
    });
  });
});

test('não há nomes ou chaves repetidas dentro de um mesmo ambiente', () => {
  Object.entries(DEFAULT_CATEGORY_SETS).forEach(([environment, set]) => {
    const names = set.map((item) => normalizeCategoryName(item.name));
    const keys = set.map((item) => item.key);
    assert.equal(new Set(names).size, names.length, `nome repetido em ${environment}`);
    assert.equal(new Set(keys).size, keys.length, `chave repetida em ${environment}`);
  });
});

test('categoria existente é reconhecida mesmo com acento e caixa diferentes', () => {
  const plan = defaultCategoryPlan({
    environment: 'pf',
    existingCategories: [{ name: 'salario', environment: 'pf' }, { name: ' Alimentação ', environment: 'pf' }],
  });

  assert.equal(plan.find((item) => item.name === 'Salário').exists, true);
  assert.equal(plan.find((item) => item.name === 'Alimentação').exists, true);
  assert.equal(plan.find((item) => item.name === 'Transporte').exists, false);
});

test('mesmo nome em outro ambiente não bloqueia a criação', () => {
  const plan = defaultCategoryPlan({
    environment: 'pf',
    existingCategories: [{ name: 'Salário', environment: 'pj' }],
  });

  assert.equal(plan.every((item) => item.exists === false), true);
});

test('nada é criado quando todas as categorias padrão já existem', () => {
  const existing = DEFAULT_CATEGORY_SETS.pj.map((item) => ({
    name: item.name,
    environment: 'pj',
    kind: item.kind,
    group: item.group,
  }));

  const plan = defaultCategoryPlan({ environment: 'pj', existingCategories: existing });
  assert.equal(pendingDefaultCategories(plan).length, 0);
});

test('categorias personalizadas são preservadas e ficam fora da criação', () => {
  const existing = [{ id: 'custom-1', name: 'Feira do bairro', environment: 'pf', kind: 'expense', group: 'operacional' }];
  const plan = defaultCategoryPlan({ environment: 'pf', existingCategories: existing });
  const pending = pendingDefaultCategories(plan);

  assert.equal(pending.some((item) => item.name === 'Feira do bairro'), false);
  assert.equal(plan.length, DEFAULT_CATEGORY_SETS.pf.length);
});

test('seleção explícita limita o que será criado', () => {
  const plan = defaultCategoryPlan({ environment: 'pj', existingCategories: [] });
  const pending = pendingDefaultCategories(plan, ['pj-das', 'pj-prolabore']);

  assert.deepEqual(pending.map((item) => item.name), ['Pró-labore do titular', 'DAS / Simples Nacional']);
});

test('payload contém apenas campos do modelo e o ambiente escolhido', () => {
  const plan = defaultCategoryPlan({ environment: 'invest', existingCategories: [] });
  const payload = buildCategoryPayload(pendingDefaultCategories(plan), 'invest');

  assert.ok(payload.length > 0);
  payload.forEach((row) => {
    assert.deepEqual(Object.keys(row).sort(), ['environment', 'group', 'kind', 'name']);
    assert.equal(row.environment, 'invest');
  });
});

test('ambientes diferentes têm conjuntos diferentes', () => {
  const pjNames = DEFAULT_CATEGORY_SETS.pj.map((item) => item.name);
  const pfNames = DEFAULT_CATEGORY_SETS.pf.map((item) => item.name);

  assert.equal(pjNames.includes('Salário'), false);
  assert.equal(pfNames.includes('Pró-labore do titular'), false);
});

test('conjunto de investimentos não duplica tipos de operação existentes', () => {
  const names = DEFAULT_CATEGORY_SETS.invest.map((item) => normalizeCategoryName(item.name));

  ['aporte', 'aporte em renda fixa', 'resgate', 'proventos'].forEach((forbidden) => {
    assert.equal(names.includes(forbidden), false, `não deve criar categoria "${forbidden}"`);
  });
});