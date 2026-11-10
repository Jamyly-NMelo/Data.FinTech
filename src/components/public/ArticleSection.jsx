import React from 'react';

export default function ArticleSection({ section }) {
  return (
    <section className="mb-8 space-y-4">
      {section.heading ? <h2 className="font-heading text-xl font-bold">{section.heading}</h2> : null}
      {section.paragraphs?.map((paragraph, index) => (
        <p key={`${section.heading || 'section'}-${index}`} className="text-sm leading-7 text-muted-foreground">
          {paragraph}
        </p>
      ))}
      {section.table ? (
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-max text-left text-xs">
            {section.table.caption ? <caption className="px-3 py-2 text-left font-medium text-muted-foreground">{section.table.caption}</caption> : null}
            <thead>
              <tr className="border-y border-border/70 bg-muted/40">
                {section.table.columns.map((column) => <th key={column} className="px-3 py-2 font-semibold">{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, index) => (
                <tr key={index} className="border-b border-border/50 last:border-0">
                  {row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {section.paragraphsAfterTable?.map((paragraph, index) => (
        <p key={`after-${index}`} className="text-sm leading-7 text-muted-foreground">{paragraph}</p>
      ))}
      {section.bullets?.length ? (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
          {section.bullets.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      ) : null}
      {section.callout ? <p className="rounded-xl border border-border/70 bg-card p-4 text-sm leading-6">{section.callout}</p> : null}
    </section>
  );
}
