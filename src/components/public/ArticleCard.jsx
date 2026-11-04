import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '@/lib/format';

export default function ArticleCard({ article }) {
  return (
    <Link
      to={`/artigos/${article.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/80">{article.topic}</span>
      <h2 className="mt-2 font-heading text-lg font-bold group-hover:text-primary">{article.title}</h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{article.description}</p>
      <p className="mt-4 text-[11px] text-muted-foreground">
        {article.publishedAt ? formatDate(article.publishedAt) : null}
        {article.readingMinutes ? ` · ${article.readingMinutes} min de leitura` : null}
      </p>
    </Link>
  );
}
