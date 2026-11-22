import type { Participant } from '@secret-santa/shared';
import { CheckIcon, CircleIcon, MailIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api.ts';
import { errorMessage } from '@/lib/errors.ts';

import { formatMoment } from '../format.ts';
import type { EventSectionProps } from '../types.ts';

export function MailStatus({
  participant,
  setEvent,
}: Pick<EventSectionProps, 'setEvent'> & { participant: Participant }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setPending(true);
    setError(null);
    const result = await api<Participant>(`/api/event/participants/${participant.id}/mail`, { method: 'POST' });
    setPending(false);
    if (!result.ok) {
      setError(errorMessage(result.error));
      return;
    }
    setEvent((current) => ({
      ...current,
      participants: current.participants.map((other) => (other.id === participant.id ? result.data : other)),
    }));
  }

  return (
    <div className='flex flex-col gap-1 pr-3.5 pb-2'>
      <div className='flex flex-wrap items-center justify-between gap-x-3'>
        <StatusBadge participant={participant} />
        {participant.mailStatus !== 'not_sent' && (
          <Button variant='link' size='sm' onClick={() => void resend()} disabled={pending}>
            {pending ? 'Envoi…' : 'Renvoyer le mail'}
          </Button>
        )}
      </div>
      {error && (
        <p role='alert' className='text-destructive text-sm font-semibold'>
          {error}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ participant }: { participant: Participant }) {
  switch (participant.mailStatus) {
    case 'not_sent':
      return (
        <Badge variant='pending'>
          <CircleIcon />
          Pas encore envoyé
        </Badge>
      );
    case 'sent':
      return (
        <Badge>
          <MailIcon />
          Mail envoyé {participant.mailSentAt && formatMoment(participant.mailSentAt)}
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant='failed'>
          <TriangleAlertIcon />
          Échec de l’envoi
        </Badge>
      );
    case 'opened':
      return (
        <Badge variant='success'>
          <CheckIcon />
          Mail ouvert {participant.mailOpenedAt && formatMoment(participant.mailOpenedAt)}
        </Badge>
      );
  }
}
