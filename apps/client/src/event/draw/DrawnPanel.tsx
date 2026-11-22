import type { Participant } from '@secret-santa/shared';
import { LoaderCircleIcon, LockIcon, SendIcon } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api.ts';

import type { EventSectionProps, MailSending } from '../types.ts';

type Props = EventSectionProps & {
  mailSending: MailSending;
  setMailSending: (sending: MailSending) => void;
};

const needsMail = (participant: Participant) =>
  participant.mailStatus === 'not_sent' || participant.mailStatus === 'failed';

export function DrawnPanel({ event, setEvent, mailSending, setMailSending }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const toSend = event.participants.filter(needsMail).length;
  const sent = event.participants.length - toSend;
  const opened = event.participants.filter((participant) => participant.mailStatus === 'opened').length;
  const sendLabel = toSend === 1 ? 'Envoyer 1 mail' : `Envoyer les ${toSend} mails`;

  // One request per participant, in display order, so each row shows its own progress.
  async function sendMails() {
    const queue = event.participants.filter(needsMail);
    let failures = 0;
    setSummary(null);
    for (const [index, participant] of queue.entries()) {
      setMailSending({ participantId: participant.id, position: index + 1, total: queue.length });
      const result = await api<Participant>(`/api/event/participants/${participant.id}/mail`, { method: 'POST' });
      const updated: Participant = result.ok ? result.data : { ...participant, mailStatus: 'failed' };
      if (updated.mailStatus === 'failed') failures++;
      setEvent((current) => ({
        ...current,
        participants: current.participants.map((other) => (other.id === participant.id ? updated : other)),
      }));
    }
    setMailSending(null);
    const delivered = queue.length - failures;
    const deliveredText = `${delivered} ${delivered === 1 ? 'mail envoyé' : 'mails envoyés'}`;
    setSummary(
      failures === 0 ? `${deliveredText}.` : `${deliveredText}, ${failures} ${failures === 1 ? 'échec' : 'échecs'}.`,
    );
  }

  return (
    <section className='flex flex-col gap-3'>
      <Alert className='animate-in fade-in slide-in-from-bottom-3 duration-700'>
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
      {(toSend > 0 || mailSending) && (
        <Button size='lg' className='w-full' onClick={() => void sendMails()} disabled={mailSending !== null}>
          {mailSending ? <LoaderCircleIcon className='animate-spin' /> : <SendIcon />}
          {mailSending ? `Envoi ${mailSending.position} sur ${mailSending.total}…` : sendLabel}
        </Button>
      )}
      {summary && (
        <p role='status' className='text-muted-foreground'>
          {summary}
        </p>
      )}
    </section>
  );
}
