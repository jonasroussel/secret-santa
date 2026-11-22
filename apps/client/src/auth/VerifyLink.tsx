import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { api, type ApiErrorCode, type ApiResult } from '@/lib/api.ts';
import { errorMessage } from '@/lib/errors.ts';

// A token is single-use: StrictMode's double effect must not post it twice.
const verifications = new Map<string, Promise<ApiResult<void>>>();

function verify(token: string) {
  let verification = verifications.get(token);
  if (!verification) {
    verification = api<void>('/api/auth/verify', { method: 'POST', body: { token } });
    verifications.set(token, verification);
  }
  return verification;
}

export function VerifyLink({ token }: { token: string }) {
  const [error, setError] = useState<ApiErrorCode | null>(null);

  useEffect(() => {
    void verify(token).then((result) => {
      if (result.ok) location.replace('/');
      else setError(result.error);
    });
  }, [token]);

  if (error === null) return <p className='text-muted-foreground'>Connexion en cours…</p>;

  if (error === 'invalid_link') {
    return (
      <>
        <header>
          <h1 className='text-primary text-[2rem] leading-tight font-semibold'>Ce lien n’est plus valable</h1>
          <p className='text-muted-foreground mt-2'>
            Il a déjà été utilisé ou il a expiré. Demandes-en un nouveau, il arrivera dans quelques instants.
          </p>
        </header>
        <Button onClick={() => location.assign('/connexion')}>Recevoir un nouveau lien</Button>
      </>
    );
  }

  return (
    <>
      <p role='alert' className='text-destructive font-semibold'>
        {errorMessage(error)}
      </p>
      <Button onClick={() => location.reload()}>Réessayer</Button>
    </>
  );
}
