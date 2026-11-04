export const ARTICLES = [
  {
    "slug": "margem-de-contribuicao",
    "topic": "Indicadores empresariais",
    "title": "Margem de contribuição: o número que mostra se um produto paga a conta",
    "description": "Como calcular a margem de contribuição por produto, encontrar o ponto de equilíbrio e usar isso para decidir preço, mix e corte de itens.",
    "summary": "Faturamento alto não garante resultado. A margem de contribuição mostra, item por item, quanto sobra para pagar a estrutura do negócio — e é a base para decidir o que vender mais e o que revisar.",
    "publishedAt": "2026-10-27",
    "updatedAt": null,
    "readingMinutes": 7,
    "sections": [
      {
        "heading": "O que é, em uma frase",
        "paragraphs": [
          "Margem de contribuição é o preço de venda menos os custos e despesas que variam com a venda daquele item. É o valor que cada venda entrega para cobrir a estrutura fixa do negócio e, depois dela, formar lucro.",
          "Ela é calculada por unidade vendida ou por período. Se você calcular apenas a média de todos os produtos, apaga justamente as diferenças que orientam a decisão: um item pode sustentar a operação enquanto outro consome caixa."
        ]
      },
      {
        "heading": "Como calcular, com um exemplo de três produtos",
        "paragraphs": [
          "Considere uma empresa com os três itens abaixo. Os valores são um exemplo hipotético, mas a lógica é a mesma em qualquer negócio que venda mais de um produto."
        ],
        "table": {
          "caption": "Margem de contribuição por produto (exemplo hipotético)",
          "columns": [
            "Produto",
            "Preço",
            "Custo variável",
            "Margem (R$)",
            "Margem (%)"
          ],
          "rows": [
            [
              "A",
              "120,00",
              "72,00",
              "48,00",
              "40,0%"
            ],
            [
              "B",
              "80,00",
              "60,00",
              "20,00",
              "25,0%"
            ],
            [
              "C",
              "200,00",
              "176,00",
              "24,00",
              "12,0%"
            ]
          ]
        },
        "paragraphsAfterTable": [
          "O produto C vende mais caro e costuma ser tratado como o mais importante da lista. Mas cada unidade dele entrega apenas R$ 24,00 para pagar a estrutura, contra R$ 48,00 do produto A."
        ]
      },
      {
        "heading": "Ponto de equilíbrio: quanto é preciso vender",
        "paragraphs": [
          "Se a estrutura fixa custa R$ 9.600 por mês, o ponto de equilíbrio depende do mix vendido. Vendendo apenas o produto A, seriam 200 unidades no mês (9.600 ÷ 48). Vendendo apenas o produto C, seriam 400 unidades (9.600 ÷ 24).",
          "Com o mix real, divide-se o custo fixo pela margem média ponderada. Se metade das vendas é do produto A e metade do produto C, a margem média é R$ 36,00 e o equilíbrio fica em cerca de 267 unidades por mês."
        ],
        "callout": "O ponto de equilíbrio não é uma meta de venda: é o volume mínimo para não perder dinheiro. Tudo o que vier acima dele é resultado."
      },
      {
        "heading": "O que fazer com essa informação",
        "bullets": [
          "Priorize esforço comercial e espaço no catálogo para os itens de maior margem por unidade e por hora de operação.",
          "Revise o preço dos itens de margem apertada antes de tentar aumentar volume: crescer vendendo pouco contributivo costuma agravar o caixa.",
          "Trate desconto como redução direta de margem. No produto C, um desconto de 10% derruba a margem de R$ 24,00 para R$ 4,00 — queda de mais de 80% na contribuição.",
          "Antes de cortar um item de margem baixa, verifique se ele existe para trazer clientes que compram outros produtos. A margem baixa pode ser uma decisão, desde que consciente."
        ]
      },
      {
        "heading": "Cuidados que evitam conclusões erradas",
        "bullets": [
          "Não ratear custo fixo por unidade produzida: isso transforma um custo fixo em variável e distorce a margem de todos os itens.",
          "Incluir impostos sobre a venda e taxas de meio de pagamento no cálculo, porque eles variam com o faturamento.",
          "Considerar a ociosidade: um item de boa margem que exige equipamento parado por muitas horas pode não ser o melhor uso da capacidade.",
          "Recalcular quando o custo do insumo ou a tarifa mudar. Margem não é um número permanente, é uma medida do mês."
        ]
      }
    ]
  },
  {
    "slug": "formacao-de-precos",
    "topic": "Precificação",
    "title": "Como formar preço de venda sem perder margem",
    "description": "Custo unitário, taxa de cartão, comissão e impostos: como chegar a um preço que cobre tudo e ainda deixa lucro de verdade.",
    "summary": "A maior parte dos preços errados nasce de uma conta incompleta: soma o custo do produto, aplica uma porcentagem e ignora impostos, taxas e custos fixos. O resultado aparece meses depois, em forma de caixa apertado.",
    "publishedAt": "2026-10-20",
    "updatedAt": null,
    "readingMinutes": 9,
    "sections": [
      {
        "heading": "Preço não é custo mais uma porcentagem",
        "paragraphs": [
          "Definir preço como “custo vezes dois” funciona apenas quando as porcentagens que incidem sobre a venda são pequenas. Impostos, taxa de cartão e comissão incidem sobre o preço, não sobre o custo — por isso entram na conta como divisor, e não como soma.",
          "Além disso, o custo fixo do negócio (aluguel, software, salários) não pertence a uma unidade específica: ele precisa ser coberto pelo conjunto das vendas, o que só acontece quando cada item tem margem positiva."
        ]
      },
      {
        "heading": "Passo 1: monte o custo variável unitário",
        "paragraphs": [
          "Some tudo o que só existe porque aquela unidade foi vendida. Se não houver venda, o gasto não acontece."
        ],
        "table": {
          "caption": "Custo variável da unidade (exemplo hipotético)",
          "columns": [
            "Item",
            "Valor"
          ],
          "rows": [
            [
              "Matéria-prima",
              "18,00"
            ],
            [
              "Embalagem",
              "2,50"
            ],
            [
              "Frete subsidiado",
              "4,00"
            ],
            [
              "Custo variável (sem percentuais)",
              "24,50"
            ]
          ]
        },
        "paragraphsAfterTable": [
          "As taxas percentuais ficam para o passo seguinte, porque dependem do preço final — e o preço é justamente o que estamos calculando."
        ]
      },
      {
        "heading": "Passo 2: transforme custos e percentuais em preço",
        "paragraphs": [
          "Com custo variável de R$ 24,50, imposto de 6%, taxa de cartão de 3,2%, comissão de 5% e margem desejada de 20%, o cálculo correto é dividir o custo pela diferença entre 100% e a soma de todos os percentuais."
        ],
        "table": {
          "caption": "Cálculo do preço de venda",
          "columns": [
            "Componente",
            "Percentual"
          ],
          "rows": [
            [
              "Imposto sobre a venda",
              "6,0%"
            ],
            [
              "Taxa de cartão",
              "3,2%"
            ],
            [
              "Comissão",
              "5,0%"
            ],
            [
              "Margem desejada",
              "20,0%"
            ],
            [
              "Soma dos percentuais",
              "34,2%"
            ],
            [
              "Preço = 24,50 ÷ (1 − 0,342)",
              "R$ 37,23"
            ]
          ]
        },
        "paragraphsAfterTable": [
          "Duas armadilhas comuns: somar as porcentagens ao custo, o que subestima o preço, e esquecer de refazer o cálculo quando a tarifa do meio de pagamento ou a alíquota muda."
        ]
      },
      {
        "heading": "Passo 3: confira a margem de contribuição",
        "paragraphs": [
          "Do preço de R$ 37,23, retiram-se os R$ 24,50 de custo variável e R$ 5,29 de percentuais sobre a venda (14,2% do preço). Sobram R$ 7,44 por unidade — exatamente os 20% de margem pretendidos.",
          "Com custo fixo mensal de R$ 6.000, o ponto de equilíbrio é 6.000 ÷ 7,44, ou seja, cerca de 807 unidades por mês. Vender 700 unidades pode parecer um bom número de pedidos e ainda assim fechar o mês no prejuízo."
        ],
        "callout": "A margem por unidade é o que paga a estrutura. Sem ela calculada corretamente, volume não resolve o caixa."
      },
      {
        "heading": "Erros que destroem margem sem aparecer na planilha",
        "bullets": [
          "Ratear o custo fixo por unidade produzida e mudar o preço toda vez que a produção varia.",
          "Dar desconto sobre um preço de margem apertada: cada ponto de desconto sai direto da contribuição.",
          "Aceitar pedidos no limite da capacidade sem considerar horas extras e desgaste de equipamento.",
          "Misturar despesas financeiras, como juros de antecipação de recebíveis, com o custo operacional do produto."
        ]
      },
      {
        "heading": "Revisão periódica, não anual",
        "paragraphs": [
          "Preço não é uma decisão definitiva. Insumos mudam, tarifas mudam e o próprio mix muda. Uma revisão trimestral com os três números — custo variável, percentuais sobre a venda e custo fixo mensal — é suficiente para manter a margem sob controle sem transformar a gestão em um projeto permanente."
        ]
      }
    ]
  },
  {
    "slug": "organizacao-financeira-pessoal",
    "topic": "Finanças pessoais",
    "title": "Organização financeira pessoal: um método de quatro passos para quem tem renda variável",
    "description": "Um passo a passo para descobrir seu custo de vida real, montar reserva e parar de decidir no impulso quando a renda muda a cada mês.",
    "summary": "Renda variável não impede organização financeira — muda a ordem de prioridade. O método abaixo parte do que você já gastou, e não de uma regra genérica de orçamento.",
    "publishedAt": "2026-10-13",
    "updatedAt": null,
    "readingMinutes": 7,
    "sections": [
      {
        "heading": "Passo 1: descubra o custo de vida real",
        "paragraphs": [
          "Antes de definir metas, é preciso saber quanto custa o seu mês. O caminho mais curto é olhar para trás: reúna extratos e faturas dos últimos dois a três meses e some tudo o que saiu, sem filtrar pelo que você gostaria de ter gasto.",
          "Dois a três meses capturam contas trimestrais e gastos sazonais que um único mês esconde. O número encontrado é o seu custo de vida atual — não o idealizado."
        ],
        "callout": "Custo de vida não é meta de gasto: é o ponto de partida realista para qualquer plano."
      },
      {
        "heading": "Passo 2: classifique em três grupos que mudam a decisão",
        "paragraphs": [
          "Classificar por categoria ajuda a entender o gasto, mas a decisão financeira depende de três grupos. A ordem de ataque é sempre a mesma."
        ],
        "table": {
          "caption": "Grupos de despesa e prioridade de ação",
          "columns": [
            "Grupo",
            "Exemplos",
            "Prioridade"
          ],
          "rows": [
            [
              "Essenciais fixos",
              "moradia, energia, transporte, alimentação básica, saúde",
              "Proteger primeiro"
            ],
            [
              "Variáveis ajustáveis",
              "lazer, delivery, assinaturas, compras",
              "Ajustar quando a renda cai"
            ],
            [
              "Dívidas caras",
              "cartão rotativo, cheque especial, crédito pessoal",
              "Eliminar antes de investir"
            ]
          ]
        },
        "paragraphsAfterTable": [
          "A armadilha mais comum é tentar investir antes de eliminar uma dívida caríssima: raramente existe aplicação conservadora que renda mais do que os juros de um rotativo."
        ]
      },
      {
        "heading": "Passo 3: dimensione a reserva pelo seu custo, não pela sua renda",
        "paragraphs": [
          "A reserva de emergência existe para cobrir despesas quando a renda para ou diminui. Por isso ela é calculada sobre o custo de vida mensal, não sobre quanto você ganha.",
          "Com renda fixa, a referência usual é de três a seis meses de custo. Com renda variável, comece pela faixa maior: seis meses."
        ],
        "table": {
          "caption": "Reserva alvo para diferentes custos mensais",
          "columns": [
            "Custo mensal",
            "3 meses",
            "6 meses",
            "12 meses"
          ],
          "rows": [
            [
              "R$ 4.200",
              "R$ 12.600",
              "R$ 25.200",
              "R$ 50.400"
            ]
          ]
        },
        "paragraphsAfterTable": [
          "Enquanto a reserva não está completa, ela é o destino prioritário do que sobra — em conta de liquidez diária, separada do dinheiro do dia a dia."
        ]
      },
      {
        "heading": "Passo 4: defina uma regra para os meses bons",
        "paragraphs": [
          "Quem tem renda variável precisa de uma regra escrita para os meses acima da média; caso contrário, o excedente desaparece em gastos que passam a se repetir no mês seguinte.",
          "Um critério simples e verificável: em meses com receita acima da média dos últimos seis meses, metade do excedente vai para a reserva ou para o objetivo em curso, e a outra metade pode ser usada sem culpa. A regra só vale depois que os essenciais estão pagos e as dívidas caras estão equacionadas."
        ]
      },
      {
        "heading": "Revisão mensal de vinte minutos",
        "bullets": [
          "Some o que entrou e o que saiu no mês e compare com o custo de vida calculado.",
          "Verifique se alguma assinatura ou gasto recorrente cresceu sem uma decisão consciente.",
          "Atualize o saldo da reserva e a distância até a meta.",
          "Revise as dívidas: saldo devedor, taxa de juros e próxima parcela."
        ],
        "paragraphsAfterTable": [
          "Organização financeira não é prever o futuro; é reduzir o número de decisões tomadas no susto. Com custo de vida conhecido, reserva em formação e uma regra para os meses bons, a renda variável deixa de ser desculpa."
        ]
      }
    ]
  },
  {
    "slug": "fluxo-de-caixa-para-mei",
    "topic": "MEI e pequenos negócios",
    "title": "Fluxo de caixa para MEI: por que o dinheiro da empresa não é o seu dinheiro",
    "description": "Como separar as contas, definir um pró-labore fixo e reservar impostos para o caixa do MEI não virar surpresa no fim do mês.",
    "summary": "Misturar o caixa da empresa com o dinheiro pessoal é o motivo mais comum para um MEI faturar bem e ainda assim não conseguir pagar as contas. Este guia mostra como separar as duas coisas e acompanhar o caixa em poucos minutos por semana.",
    "publishedAt": "2026-10-06",
    "updatedAt": "2026-10-20",
    "readingMinutes": 8,
    "sections": [
      {
        "heading": "O problema começa quando existe uma conta só",
        "paragraphs": [
          "Quando o cliente paga, o valor cai na mesma conta que paga o mercado, a escola e a conta de luz. No fim do mês o saldo parece positivo, mas ninguém sabe dizer quanto daquele dinheiro já tem dono: impostos, fornecedores, pró-labore e custos do mês seguinte.",
          "Esse é o ponto central: faturar não é lucrar, e lucrar não é ter caixa disponível. O que sobra depois de todas as obrigações do negócio é o que pode ser retirado — e mesmo assim parte dele precisa ficar como reserva."
        ]
      },
      {
        "heading": "Primeiro passo: duas contas, três destinos",
        "paragraphs": [
          "Abra uma conta, ou pelo menos uma subconta, exclusiva para o CNPJ, e trate o dinheiro pessoal como uma despesa da empresa. O pró-labore deixa de ser “o que sobra” e passa a ser uma linha fixa do mês.",
          "Com a conta separada, todo recebimento tem três destinos previsíveis. Quando um deles não é planejado, ele acaba comendo os outros dois."
        ],
        "bullets": [
          "Custos do negócio: fornecedores, insumos, aluguel, ferramentas e taxas de cartão.",
          "Impostos: o DAS mensal e os demais tributos da atividade.",
          "Retirada do titular: valor fixo mensal, definido antes do mês começar."
        ]
      },
      {
        "heading": "Exemplo prático: um mês de um MEI de serviços",
        "paragraphs": [
          "Considere um exemplo hipotético de um MEI de serviços com faturamento de R$ 8.000 no mês. O erro comum é comemorar o faturamento; o que importa é o que fica disponível depois dos compromissos."
        ],
        "table": {
          "caption": "Um mês de exemplo (valores em reais, hipotéticos)",
          "columns": [
            "Item",
            "Valor"
          ],
          "rows": [
            [
              "Faturamento recebido",
              "8.000"
            ],
            [
              "Custos variáveis (insumos, deslocamento, taxas)",
              "1.400"
            ],
            [
              "Custos fixos do negócio (software, internet, contador)",
              "600"
            ],
            [
              "DAS e demais impostos",
              "80"
            ],
            [
              "Pró-labore do titular",
              "3.000"
            ],
            [
              "Sobra para reserva",
              "2.920"
            ]
          ]
        },
        "callout": "A sobra não é retirada: ela é a reserva que cobre meses fracos, equipamentos e imprevistos."
      },
      {
        "heading": "Quanto guardar antes de aumentar a retirada",
        "paragraphs": [
          "Uma referência conservadora é manter o equivalente a três meses de custos fixos do negócio somados ao seu pró-labore. Com R$ 600 de custos fixos e R$ 3.000 de retirada, a meta fica em R$ 10.800.",
          "Enquanto a reserva não existe, a sobra do mês vai para ela. Depois de formada, a sobra pode ser dividida entre reinvestimento — equipamento, ferramenta, capacitação — e retirada extra, sempre de forma planejada e não como reação a um mês bom."
        ]
      },
      {
        "heading": "O que fazer com meses de faturamento baixo",
        "paragraphs": [
          "Meses ruins não se resolvem com uma retirada menor decidida de última hora: se resolvem com reserva. Se ela ainda não está formada, a ordem de corte é primeiro despesas variáveis do negócio, depois adiamento de investimentos e, por último, a retirada do titular.",
          "Anote também quais são os compromissos fixos mínimos. É esse número que define quanto de caixa precisa existir antes de qualquer gasto discricionário."
        ]
      },
      {
        "heading": "Como acompanhar em cinco minutos por semana",
        "bullets": [
          "Registre cada entrada e saída no dia em que acontece, separando a data de competência da data de pagamento.",
          "Confira semanalmente três números: saldo em conta, contas a pagar da semana e faturamento acumulado do mês.",
          "Diferencie o que foi vendido do que foi recebido: boleto emitido não é caixa.",
          "Feche o mês com um único número de retirada e mantenha-o igual mesmo quando o mês vier acima da média."
        ],
        "paragraphsAfterTable": [
          "Não é preciso um sistema caro para começar. Uma planilha ou um aplicativo de gestão com contas, lançamentos e categorias resolve — desde que a separação entre pessoal e empresarial seja respeitada em todos os lançamentos."
        ]
      }
    ]
  }
];

export const getArticleBySlug = (slug) => ARTICLES.find((article) => article.slug === slug) || null;

export const getRelatedArticles = (slug) => {
  const article = getArticleBySlug(slug);
  if (!article) return [];
  return ARTICLES.filter((item) => item.slug !== slug && item.topic === article.topic).slice(0, 3);
};
