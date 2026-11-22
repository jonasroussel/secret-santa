import type { SecretSantaEvent, Session } from '@secret-santa/shared';
import { useEffect, useState } from 'react';

import { Brand } from '@/components/brand.tsx';
import { Button } from '@/components/ui/button';
import { api, type ApiErrorCode } from '@/lib/api.ts';
import { errorMessage } from '@/lib/errors.ts';

import { CreateEventCard } from './CreateEventCard.tsx';
import { EventView } from './EventView.tsx';

type State =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; event: SecretSantaEvent };

function failure(error: ApiErrorCode): State {
  // api() is already redirecting to the login page.
  return error === 'unauthorized' ? { status: 'loading' } : { status: 'failed', message: errorMessage(error) };
}

async function loadEvent(): Promise<State> {
  const session = await api<Session>('/api/session');
  if (!session.ok) return failure(session.error);
  const event = await api<SecretSantaEvent>('/api/event');
  if (event.ok) return { status: 'ready', event: event.data };
  return event.error === 'not_found' ? { status: 'empty' } : failure(event.error);
}

async function logout() {
  await api('/api/auth/logout', { method: 'POST' });
  location.assign('/connexion');
}

export function AdminPage() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    void loadEvent().then(setState);
  }, []);

  return (
    <main className='mx-auto flex max-w-xl flex-col gap-6 px-6 py-4'>
      <header className='flex items-center justify-between'>
        <Brand />
        <Button variant='ghost' size='sm' onClick={() => void logout()}>
          Se déconnecter
        </Button>
      </header>
      {state.status === 'loading' && <p className='text-muted-foreground'>Chargement…</p>}
      {state.status === 'failed' && (
        <>
          <p role='alert' className='text-destructive font-semibold'>
            {state.message}
          </p>
          <Button onClick={() => location.reload()}>Réessayer</Button>
        </>
      )}
      {state.status === 'empty' && <CreateEventCard onCreated={(event) => setState({ status: 'ready', event })} />}
      {state.status === 'ready' && <EventView initial={state.event} />}
    </main>
  );
}
