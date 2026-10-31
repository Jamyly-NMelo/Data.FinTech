import React from 'react';
import ArticleCard from '@/components/public/ArticleCard';
import { ARTICLES } from '@/content/articles';
import { usePageMeta } from '@/lib/seo';

export default function Articles() {
  usePageMeta({
    title: 'Conteúdos sobre finanças pessoais e gestão de negócios',
    description:
      'Artigos originais sobre fluxo de caixa, precificação, margem de contribuição, organização financeira pessoal e indicadores para pequenos negócios.',
    path: '/artigos',
  });

  return (
    <div>
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Conteúdos Data Fin</p>
        <h1 className="mt-3 font-heading text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          Finanças explicadas com contas, não com frases prontas
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
          Artigos escritos para resolver dúvidas concretas de quem organiza o próprio dinheiro e de quem toca um pequeno
          negócio. Cada texto mostra o cálculo completo, com exemplos hipotéticos identificados.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {ARTICLES.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>

      <p className="mt-10 rounded-2xl border border-border/70 bg-card p-5 text-sm leading-6 text-muted-foreground">
        Publicamos um conteúdo por vez, revisado antes de ir ao ar. Para sugerir um tema, use a{' '}
        <a href="/contato" className="font-medium text-primary underline-offset-4 hover:underline">
          página de contato
        </a>
        .
      </p>
    </div>
  );
}