import type { Participant, ParticipantInput } from '@secret-santa/shared';

import { api } from '@/lib/api.ts';
import { errorMessage } from '@/lib/errors.ts';

import type { EventSectionProps } from '../types.ts';
import { ParticipantForm } from './ParticipantForm.tsx';
import { ParticipantRow } from './ParticipantRow.tsx';

export function ParticipantsSection({ event, setEvent }: EventSectionProps) {
  async function add(input: ParticipantInput) {
    const result = await api<Participant>('/api/event/participants', { method: 'POST', body: input });
    if (!result.ok) return errorMessage(result.error);
    setEvent((current) => ({ ...current, participants: [...current.participants, result.data] }));
    return null;
  }

  return (
    <section className='flex flex-col gap-3'>
      <h2 className='text-secondary flex items-baseline justify-between text-[1.3125rem] font-semibold'>
        Participants
        <small className='text-muted-foreground font-sans text-sm font-normal'>
          {event.participants.length} {event.participants.length === 1 ? 'personne' : 'personnes'}
        </small>
      </h2>
      {event.participants.length > 0 && (
        <ul className='flex flex-col gap-2'>
          {event.participants.map((participant) => (
            <ParticipantRow key={participant.id} participant={participant} event={event} setEvent={setEvent} />
          ))}
        </ul>
      )}
      {event.drawnAt === null && (
        <div className='bg-card border-border flex flex-col gap-4 rounded-lg border p-4'>
          <h3 className='font-semibold'>Ajouter une personne</h3>
          <ParticipantForm submitLabel='Ajouter' participants={event.participants} onSubmit={add} />
        </div>
      )}
    </section>
  );
}
