import React, { useState } from 'react';
import { post } from '@/services/api';
import InfoPage, { InfoSection } from '@/components/public/InfoPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const EMPTY_FORM = { name: '', email: '', message: '' };

export default function Contact() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState('idle');

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('sending');
    try {
      await post('records.create', {
        entity: 'ContactMessage',
        values: {
          name: form.name.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
        },
      });
      setForm(EMPTY_FORM);
      setStatus('sent');
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <InfoPage
      title="Contato"
      description="Envie sugestões de temas, correções de conteúdo ou dúvidas sobre o aplicativo. As mensagens ficam registradas para a equipe do Data Fin."
      path="/contato"
    >
      <InfoSection heading="Formulário de contato">
        {status === 'sent' ? (
          <div className="rounded-2xl border border-success/40 bg-success/10 p-5 text-sm leading-6">
            <p className="font-semibold">Mensagem registrada.</p>
            <p className="mt-1 text-muted-foreground">
              Obrigado pelo contato. Se precisar enviar outra mensagem, o formulário está disponível novamente abaixo.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setStatus('idle')}>
              Escrever outra mensagem
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Nome</Label>
                <Input
                  id="contact-name"
                  value={form.name}
                  onChange={update('name')}
                  required
                  maxLength={120}
                  autoComplete="name"
                  placeholder="Como devemos chamar você"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">E-mail</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  required
                  maxLength={160}
                  autoComplete="email"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-message">Mensagem</Label>
              <Textarea
                id="contact-message"
                value={form.message}
                onChange={update('message')}
                required
                rows={6}
                maxLength={4000}
                placeholder="Descreva sua sugestão ou dúvida"
              />
            </div>

            {status === 'error' ? (
              <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
                Não foi possível registrar a mensagem agora. Tente novamente em alguns instantes.
              </p>
            ) : null}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? 'Enviando…' : 'Enviar mensagem'}
              </Button>
              <span className="text-xs text-muted-foreground">Não envie senhas nem dados de cartão.</span>
            </div>
          </form>
        )}
      </InfoSection>

      <InfoSection heading="Sobre os seus dados">
        <p>
          Usamos o nome, o e-mail e a mensagem apenas para responder ao contato. O tratamento dos dados está descrito na{' '}
          <a href="/privacidade" className="font-medium text-primary underline-offset-4 hover:underline">
            Política de Privacidade
          </a>
          .
        </p>
      </InfoSection>
    </InfoPage>
  );
}