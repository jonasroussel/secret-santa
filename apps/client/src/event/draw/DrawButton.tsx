import type { SecretSantaEvent } from '@secret-santa/shared';
import { BellIcon, BellOffIcon } from 'lucide-react';
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
import { DrawAnimation, drawAnimationDuration } from './DrawAnimation.tsx';
import { playJingle } from './jingle.ts';

const soundKey = 'secret-santa:draw-sound';

export function DrawButton({ event, setEvent }: EventSectionProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sound, setSound] = useState(() => localStorage.getItem(soundKey) === 'on');
  const enoughParticipants = event.participants.length >= 3;

  function toggleSound() {
    localStorage.setItem(soundKey, sound ? 'off' : 'on');
    setSound(!sound);
  }

  async function draw() {
    // Before any await: browsers only allow audio started from the click itself.
    const stopSound = sound ? playJingle() : () => {};
    setPending(true);
    setError(null);
    const animationEnd = new Promise((resolve) => setTimeout(resolve, drawAnimationDuration()));
    const result = await api<SecretSantaEvent>('/api/event/draw', { method: 'POST' });
    if (!result.ok) {
      stopSound();
      setPending(false);
      setError(errorMessage(result.error));
      return;
    }
    await animationEnd;
    setEvent(result.data);
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
          <Button
            variant='ghost'
            size='sm'
            className='text-muted-foreground aria-pressed:text-secondary justify-self-start'
            aria-pressed={sound}
            onClick={toggleSound}
          >
            {sound ? <BellIcon /> : <BellOffIcon />}
            {sound ? 'Son activé' : 'Son coupé'}
          </Button>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline'>Pas maintenant</Button>
            </DialogClose>
            <Button onClick={() => void draw()} disabled={pending}>
              Faire le tirage
            </Button>
          </DialogFooter>
          {pending && <DrawAnimation names={event.participants.map((participant) => participant.name)} />}
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
