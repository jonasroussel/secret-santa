import type { SecretSantaEvent } from '@secret-santa/shared';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field';
import { api } from '@/lib/api.ts';
import { errorMessage } from '@/lib/errors.ts';

import type { EventSectionProps } from '../types.ts';

export function CancelDrawDialog({ event, setEvent }: EventSectionProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mailsSent = event.participants.some((participant) => participant.mailStatus !== 'not_sent');

  async function cancel() {
    setPending(true);
    setError(null);
    const result = await api<SecretSantaEvent>('/api/event/draw', { method: 'DELETE' });
    setPending(false);
    if (result.ok) setEvent(result.data);
    else setError(errorMessage(result.error));
  }

  return (
    <Dialog onOpenChange={() => setError(null)}>
      <DialogTrigger asChild>
        <Button variant='link' size='sm' className='text-muted-foreground self-center'>
          Annuler le tirage
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler le tirage ?</DialogTitle>
          <DialogDescription asChild>
            <div className='flex flex-col gap-3'>
              <p>Le tirage sera effacé et la liste déverrouillée. Il faudra refaire le tirage.</p>
              {mailsSent && (
                <p>
                  Des mails sont déjà partis : <strong className='text-foreground'>tout le monde</strong> devra recevoir
                  un nouveau mail. Il dira que le tirage précédent est annulé et qu’il faut oublier le prénom reçu.
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <FieldError>{error}</FieldError>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline'>Garder le tirage</Button>
          </DialogClose>
          <Button onClick={() => void cancel()} disabled={pending}>
            Oui, annuler le tirage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
