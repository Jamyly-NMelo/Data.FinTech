import React from 'react';
import { CalendarClock } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import Money from '@/components/common/Money';
import SectionCard from '@/components/common/SectionCard';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/format';

export default function AgendaPanel({ agenda = [], days = 10 }) {
  return (
    <SectionCard title="Agenda financeira" description={`Contas a pagar e receber nos próximos ${days} dias.`}>
      {agenda.length === 0 ? (
        <EmptyState compact icon={CalendarClock} title="Agenda livre" description="Nenhum lançamento em aberto nessa janela." />
      ) : (
        <div className="max-h-80 space-y-3 overflow-y-auto">
          {agenda.map((group) => (
            <section key={group.date} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <h3 className="font-semibold">{formatDate(group.date)}</h3>
                <Badge variant={group.net >= 0 ? 'secondary' : 'outline'}>
                  saldo <Money value={group.net} colored />
                </Badge>
              </div>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                    <span className="min-w-0 truncate">{item.description}</span>
                    <span className="shrink-0">{item.kind === 'income' ? '+' : '−'}<Money value={item.open_amount} colored /></span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
