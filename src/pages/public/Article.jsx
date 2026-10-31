import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ArticleSection from '@/components/public/ArticleSection';
import AdSenseGate from '@/components/ads/AdSenseGate';
import AdSenseSlot from '@/components/ads/AdSenseSlot';
import { getArticleBySlug, getRelatedArticles } from '@/content/articles';
import { usePageMeta } from '@/lib/seo';
import { formatDate } from '@/lib/format';

export default function Article() {
  const { slug } = useParams();
  const article = getArticleBySlug(slug);
  const related = article ? getRelatedArticles(article.slug) : [];

  usePageMeta({
    title: article ? article.title : 'Conteúdo não encontrado',
    description: article ? article.description : 'O conteúdo procurado não existe ou foi movido.',
    path: article ? `/artigos/${article.slug}` : undefined,
    noindex: !article,
  });

  // Endereço inexistente responde como 404 para os mecanismos de busca.
  useEffect(() => {
    if (article) return undefined;
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'prerender-status-code');
    meta.setAttribute('content', '404');
    document.head.appendChild(meta);
    return () => meta.remove();
  }, [article]);

  if (!article) {
    return (
      <div className="mx-auto w-full max-w-2xl py-10 text-center">
        <h1 className="font-heading text-2xl font-bold">Conteúdo não encontrado</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Este endereço não corresponde a nenhum artigo publicado.
        </p>
        <a
          href="/artigos"
          className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Ver todos os conteúdos
        </a>
      </div>
    );
  }

  return (
    <article className="mx-auto w-full max-w-3xl">
      <AdSenseGate />

      <header className="border-b border-border/70 pb-6">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">{article.topic}</span>
        <h1 className="mt-3 font-heading text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {article.title}
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">{article.summary}</p>
        <p className="mt-5 text-[11px] text-muted-foreground">
          Publicado em {formatDate(article.publishedAt)}
          {article.updatedAt ? ` · Atualizado em ${formatDate(article.updatedAt)}` : ''} · {article.readingMinutes} min de
          leitura
        </p>
      </header>

      <div className="mt-8">
        {article.sections.map((section) => (
          <ArticleSection key={section.heading} section={section} />
        ))}
      </div>

      <AdSenseSlot className="mt-10" />

      <p className="mt-12 rounded-2xl border border-border/70 bg-card p-5 text-xs leading-6 text-muted-foreground">
        Este conteúdo é educativo e não substitui análise contábil, tributária ou de investimento para o seu caso. Os
        valores citados são hipotéticos.
      </p>

      {related.length ? (
        <section className="mt-12">
          <h2 className="font-heading text-lg font-bold">Continue lendo</h2>
          <ul className="mt-4 space-y-3">
            {related.map((item) => (
              <li key={item.slug}>
                <a
                  href={`/artigos/${item.slug}`}
                  className="group flex flex-col gap-1 rounded-xl border border-border/70 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <span className="font-medium group-hover:text-primary">{item.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.topic} · {item.readingMinutes} min de leitura
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}