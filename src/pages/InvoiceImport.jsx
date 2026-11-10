import React from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import SectionCard from '@/components/common/SectionCard';

export default function InvoiceImport() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar fatura em PDF"
        description="A importação de arquivos ainda não está disponível."
      />
      <SectionCard title="Importação indisponível">
        <p className="text-sm text-muted-foreground">
          O Apps Script não oferece envio e leitura de faturas em PDF. Cadastre os lançamentos manualmente em{' '}
          <Link className="text-primary underline-offset-4 hover:underline" to="/lancamentos">
            Lançamentos
          </Link>
          .
        </p>
      </SectionCard>
    </div>
  );
}
