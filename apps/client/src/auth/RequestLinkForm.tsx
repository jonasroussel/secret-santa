import { MailCheckIcon } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api.ts';
import { errorMessage } from '@/lib/errors.ts';

export function RequestLinkForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const email = new FormData(formEvent.currentTarget).get('email');
    setPending(true);
    setError(null);
    const result = await api('/api/auth/request-link', { method: 'POST', body: { email } });
    setPending(false);
    if (result.ok) setSent(true);
    else setError(errorMessage(result.error, { invalid_input: 'Cette adresse email n’est pas valide.' }));
  }

  return (
    <>
      <header>
        <h1 className='text-primary text-[2rem] leading-tight font-semibold'>Connexion</h1>
        <p className='text-muted-foreground mt-2'>Recevez par email un lien pour gérer votre Secret Santa.</p>
      </header>
      {sent ? (
        <Alert>
          <MailCheckIcon />
          <AlertDescription>
            Si cette adresse est autorisée, un lien de connexion vient de vous être envoyé. Il est valable 15 minutes.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={submit} onInput={() => setError(null)} className='flex flex-col gap-6'>
          <Field data-invalid={error !== null}>
            <FieldLabel htmlFor='email'>Votre adresse email</FieldLabel>
            <Input id='email' name='email' type='email' autoComplete='email' required aria-invalid={error !== null} />
            <FieldError>{error}</FieldError>
          </Field>
          <Button type='submit' disabled={pending}>
            Recevoir mon lien de connexion
          </Button>
        </form>
      )}
    </>
  );
}
