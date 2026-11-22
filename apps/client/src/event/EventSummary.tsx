import type { EventDetails, SecretSantaEvent } from '@secret-santa/shared';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { api } from '@/lib/api.ts';
import { errorMessage } from '@/lib/errors.ts';

import { EventForm } from './EventForm.tsx';
import { formatDate } from './format.ts';
import type { EventSectionProps } from './types.ts';

export function EventSummary({ event, setEvent }: EventSectionProps) {
  const [editing, setEditing] = useState(false);

  async function save(details: EventDetails) {
    const result = await api<SecretSantaEvent>('/api/event', { method: 'PUT', body: details });
    if (!result.ok) return errorMessage(result.error);
    setEvent(result.data);
    setEditing(false);
    return null;
  }

  return (
    <section className='flex flex-col gap-3'>
      <h1 className='text-primary text-[2rem] leading-tight font-semibold'>{event.name}</h1>
      <dl className='grid grid-cols-[auto_1fr] gap-2.5'>
        <Fact label='Date' value={formatDate(event.date)} />
        <Fact label='Budget' value={event.budget === null ? 'Non précisé' : `${event.budget} €`} />
      </dl>
      {event.message && (
        <div className='bg-card border-border rounded-[10px] border px-3 py-2.5'>
          <p className='text-muted-foreground text-xs'>Message pour les participants</p>
          <p className='whitespace-pre-line'>{event.message}</p>
        </div>
      )}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogTrigger asChild>
          <Button variant='link' className='self-start'>
            Modifier l’événement
          </Button>
        </DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Modifier l’événement</DialogTitle>
          </DialogHeader>
          <EventForm initial={event} submitLabel='Enregistrer' onSubmit={save} />
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className='bg-card border-border rounded-[10px] border px-3 py-2.5'>
      <dt className='text-muted-foreground text-xs'>{label}</dt>
      <dd className='font-semibold'>{value}</dd>
    </div>
  );
}
