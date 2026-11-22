import type { Exclusion } from '@secret-santa/shared';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { api } from '@/lib/api.ts';
import { errorMessage } from '@/lib/errors.ts';

import type { EventSectionProps } from '../types.ts';
import { AddExclusionForm } from './AddExclusionForm.tsx';

export function ExclusionsSection({ event, setEvent }: EventSectionProps) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameOf = (id: number) => event.participants.find((participant) => participant.id === id)?.name;

  async function remove(exclusion: Exclusion) {
    setError(null);
    const result = await api(`/api/event/exclusions/${exclusion.id}`, { method: 'DELETE' });
    if (!result.ok) {
      setError(errorMessage(result.error));
      return;
    }
    setEvent((current) => ({
      ...current,
      exclusions: current.exclusions.filter((other) => other.id !== exclusion.id),
    }));
  }

  function added(exclusion: Exclusion) {
    setEvent((current) => ({ ...current, exclusions: [...current.exclusions, exclusion] }));
    setAdding(false);
  }

  const drawn = event.drawnAt !== null;
  if (drawn && event.exclusions.length === 0) return null;

  return (
    <section className='flex flex-col gap-3'>
      <header>
        <h2 className='text-secondary text-[1.3125rem] leading-snug font-semibold'>
          Ils ne peuvent pas se tirer entre eux
        </h2>
        {!drawn && <p className='text-muted-foreground mt-1 text-sm'>Facultatif — par exemple les couples.</p>}
      </header>
      {event.exclusions.length > 0 && (
        <ul className='flex flex-col gap-2'>
          {event.exclusions.map((exclusion) => (
            <li
              key={exclusion.id}
              className='bg-card border-border border-l-secondary flex min-h-12 items-center justify-between rounded-lg border border-l-4 pl-3.5'
            >
              {nameOf(exclusion.participantIds[0])} &amp; {nameOf(exclusion.participantIds[1])}
              {!drawn && (
                <Button variant='ghost' className='text-primary' onClick={() => void remove(exclusion)}>
                  Retirer
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role='alert' className='text-destructive text-sm font-semibold'>
          {error}
        </p>
      )}
      {!drawn &&
        (adding ? (
          <AddExclusionForm participants={event.participants} onAdded={added} onCancel={() => setAdding(false)} />
        ) : (
          event.participants.length >= 2 && (
            <Button variant='link' className='self-start' onClick={() => setAdding(true)}>
              + Ajouter un couple
            </Button>
          )
        ))}
    </section>
  );
}
