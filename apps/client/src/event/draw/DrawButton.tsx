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
import { drawAnimationDuration, type DrawAnimationState } from './DrawAnimation.tsx';

type Props = EventSectionProps & { setDrawAnimation: (state: DrawAnimationState) => void };

export function DrawButton({ event, setEvent, setDrawAnimation }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enoughParticipants = event.participants.length >= 3;

  async function draw() {
    setPending(true);
    setError(null);
    setDrawAnimation('playing');
    const animationEnd = new Promise((resolve) => setTimeout(resolve, drawAnimationDuration()));
    const result = await api<SecretSantaEvent>('/api/event/draw', { method: 'POST' });
    if (!result.ok) {
      setDrawAnimation(null);
      setPending(false);
      setError(errorMessage(result.error));
      return;
    }
    await animationEnd;
    window.scrollTo({ top: 0 });
    setEvent(result.data);
    setDrawAnimation('leaving');
  }

  return (
    <section className='flex flex-col gap-2.5'>
      <Dialog onOpenChange={() => setError(null)}>
        <DialogTrigger asChild>
          <Button size='lg' className='w-full' disabled={!enoughParticipants}>
            Faire le tirage
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Faire le tirage ?</DialogTitle>
            <DialogDescription>
              Après le tirage, la liste est verrouillée : tu ne pourras plus ajouter, retirer ou renommer quelqu’un, ni
              changer les couples. Tu pourras seulement corriger un email. Pour changer la liste, il faudra annuler le
              tirage.
            </DialogDescription>
          </DialogHeader>
          <FieldError>{error}</FieldError>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline'>Pas maintenant</Button>
            </DialogClose>
            <Button onClick={() => void draw()} disabled={pending}>
              Faire le tirage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p className='text-muted-foreground text-center text-sm'>
        {enoughParticipants
          ? 'Tu enverras les mails ensuite, quand tu veux.'
          : 'Il faut au moins 3 participants pour faire le tirage.'}
      </p>
    </section>
  );
}
