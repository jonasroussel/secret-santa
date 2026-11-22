import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api.ts';
import { errorMessage } from '@/lib/errors.ts';

type Props = { email: string; tooManyRequests: boolean; onChangeEmail: () => void };

export function VerifyCodeForm({ email, tooManyRequests, onChangeEmail }: Props) {
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setPending(true);
    setError(null);
    const result = await api('/api/auth/verify', { method: 'POST', body: { email, code } });
    if (result.ok) {
      location.assign('/');
      return;
    }
    setPending(false);
    setError(
      errorMessage(result.error, {
        too_many_requests: 'Trop de codes erronés aujourd’hui. Réessaie demain.',
      }),
    );
  }

  async function resend() {
    setError(null);
    setResent(false);
    const result = await api('/api/auth/request-code', { method: 'POST', body: { email } });
    if (result.ok) {
      setCode('');
      setResent(true);
    } else {
      setError(errorMessage(result.error));
    }
  }

  return (
    <>
      <header>
        <h1 className='text-primary text-[2rem] leading-tight font-semibold'>Ton code</h1>
        <p className='text-muted-foreground mt-2'>
          {tooManyRequests ? (
            'Trop de demandes de code. Si tu as déjà reçu un code, tu peux l’entrer ici.'
          ) : (
            <>
              Un code à 6 chiffres vient de t’être envoyé à <strong className='text-foreground'>{email}</strong>. Il est
              valable 15 minutes.
            </>
          )}
        </p>
      </header>
      <form onSubmit={submit} className='flex flex-col gap-6'>
        <Field data-invalid={error !== null}>
          <FieldLabel htmlFor='code'>Code reçu par email</FieldLabel>
          <Input
            id='code'
            name='code'
            inputMode='numeric'
            autoComplete='one-time-code'
            maxLength={6}
            pattern='\d{6}'
            required
            autoFocus
            value={code}
            onChange={(changeEvent) => {
              setCode(changeEvent.target.value.replace(/\D/g, '').slice(0, 6));
              setError(null);
            }}
            aria-invalid={error !== null}
            className='h-16 text-center text-3xl font-semibold tracking-[0.4em] tabular-nums'
          />
          <FieldError>{error}</FieldError>
          {resent && <FieldDescription>Un nouveau code vient de t’être envoyé.</FieldDescription>}
        </Field>
        <Button type='submit' size='lg' disabled={pending || code.length !== 6}>
          Me connecter
        </Button>
      </form>
      <div className='flex flex-wrap justify-between gap-x-6'>
        <Button variant='link' onClick={() => void resend()}>
          Renvoyer un code
        </Button>
        <Button variant='link' onClick={onChangeEmail}>
          Changer d’adresse
        </Button>
      </div>
    </>
  );
}
