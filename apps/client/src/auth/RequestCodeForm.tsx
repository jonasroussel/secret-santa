import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api.ts';
import { errorMessage } from '@/lib/errors.ts';

type Props = { initialEmail: string; onSent: (email: string, step: 'sent' | 'too_many_requests') => void };

export function RequestCodeForm({ initialEmail, onSent }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const email = String(new FormData(formEvent.currentTarget).get('email')).trim();
    setPending(true);
    setError(null);
    const result = await api('/api/auth/request-code', { method: 'POST', body: { email } });
    setPending(false);
    if (result.ok) {
      onSent(email, 'sent');
    } else if (result.error === 'too_many_requests') {
      onSent(email, 'too_many_requests');
    } else {
      setError(errorMessage(result.error, { invalid_input: 'Cette adresse email n’est pas valide.' }));
    }
  }

  return (
    <>
      <header>
        <h1 className='text-primary text-[2rem] leading-tight font-semibold'>Connexion</h1>
        <p className='text-muted-foreground mt-2'>Reçois par email un code pour gérer ton Secret Santa.</p>
      </header>
      <form onSubmit={submit} onInput={() => setError(null)} className='flex flex-col gap-6'>
        <Field data-invalid={error !== null}>
          <FieldLabel htmlFor='email'>Ton adresse email</FieldLabel>
          <Input
            id='email'
            name='email'
            type='email'
            autoComplete='email'
            defaultValue={initialEmail}
            required
            aria-invalid={error !== null}
          />
          <FieldError>{error}</FieldError>
        </Field>
        <Button type='submit' size='lg' disabled={pending}>
          Recevoir mon code
        </Button>
      </form>
    </>
  );
}
