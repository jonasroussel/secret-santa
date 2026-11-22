import type { SecretSantaEvent } from '@secret-santa/shared';
import { LoaderCircleIcon, LockIcon, SendIcon } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api.ts';
import { errorMessage } from '@/lib/errors.ts';

import type { EventSectionProps } from '../types.ts';

export function DrawnPanel({ event, setEvent }: EventSectionProps) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toSend = event.participants.filter(
    (participant) => participant.mailStatus === 'not_sent' || participant.mailStatus === 'failed',
  ).length;
  const sent = event.participants.length - toSend;
  const opened = event.participants.filter((participant) => participant.mailStatus === 'opened').length;
  const sendLabel = toSend === 1 ? 'Envoyer 1 mail' : `Envoyer les ${toSend} mails`;

  async function sendMails() {
    setSending(true);
    setError(null);
    const result = await api<SecretSantaEvent>('/api/event/mails', { method: 'POST' });
    setSending(false);
    if (result.ok) setEvent(result.data);
    else setError(errorMessage(result.error));
  }

  return (
    <section className='flex flex-col gap-3'>
      <Alert>
        <LockIcon />
        <AlertTitle>Le tirage est fait.</AlertTitle>
        <AlertDescription>Personne, pas même toi, ne voit qui offre à qui.</AlertDescription>
      </Alert>
      {sent > 0 && (
        <p className='text-muted-foreground'>
          <strong className='text-foreground'>
            {opened} sur {event.participants.length}
          </strong>{' '}
          {opened === 1 ? 'mail déjà ouvert.' : 'mails déjà ouverts.'}
        </p>
      )}
      {toSend > 0 && (
        <Button size='lg' className='w-full' onClick={() => void sendMails()} disabled={sending}>
          {sending ? <LoaderCircleIcon className='animate-spin' /> : <SendIcon />}
          {sending ? 'Envoi en cours…' : sendLabel}
        </Button>
      )}
      {error && (
        <p role='alert' className='text-destructive font-semibold'>
          {error}
        </p>
      )}
    </section>
  );
}
