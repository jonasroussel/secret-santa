import type { Participant, ParticipantInput } from '@secret-santa/shared';
import { PencilIcon, XIcon } from 'lucide-react';
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
import { ParticipantForm } from './ParticipantForm.tsx';

export function ParticipantRow({ participant, event, setEvent }: EventSectionProps & { participant: Participant }) {
  return (
    <li className='bg-card border-border flex min-h-14 items-center gap-1 rounded-lg border py-1 pl-3.5'>
      <div className='min-w-0 flex-1'>
        <p className='truncate font-semibold'>{participant.name}</p>
        <p className='text-muted-foreground truncate text-sm'>{participant.email}</p>
      </div>
      <EditDialog participant={participant} setEvent={setEvent} />
      <RemoveDialog participant={participant} event={event} setEvent={setEvent} />
    </li>
  );
}

function EditDialog({ participant, setEvent }: Pick<EventSectionProps, 'setEvent'> & { participant: Participant }) {
  const [open, setOpen] = useState(false);

  async function save(input: ParticipantInput) {
    const result = await api<Participant>(`/api/event/participants/${participant.id}`, { method: 'PUT', body: input });
    if (!result.ok) return errorMessage(result.error);
    setEvent((current) => ({
      ...current,
      participants: current.participants.map((other) => (other.id === participant.id ? result.data : other)),
    }));
    setOpen(false);
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='ghost' size='icon' className='text-secondary' aria-label={`Modifier ${participant.name}`}>
          <PencilIcon />
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Modifier {participant.name}</DialogTitle>
        </DialogHeader>
        <ParticipantForm initial={participant} submitLabel='Enregistrer' onSubmit={save} />
      </DialogContent>
    </Dialog>
  );
}

function RemoveDialog({ participant, event, setEvent }: EventSectionProps & { participant: Participant }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const partners = event.exclusions
    .filter((exclusion) => exclusion.participantIds.includes(participant.id))
    .map((exclusion) => {
      const partnerId = exclusion.participantIds.find((id) => id !== participant.id);
      return event.participants.find((other) => other.id === partnerId)?.name;
    });

  async function remove() {
    setPending(true);
    setError(null);
    const result = await api(`/api/event/participants/${participant.id}`, { method: 'DELETE' });
    setPending(false);
    if (!result.ok) {
      setError(errorMessage(result.error));
      return;
    }
    setEvent((current) => ({
      ...current,
      participants: current.participants.filter((other) => other.id !== participant.id),
      exclusions: current.exclusions.filter((exclusion) => !exclusion.participantIds.includes(participant.id)),
    }));
  }

  return (
    <Dialog onOpenChange={() => setError(null)}>
      <DialogTrigger asChild>
        <Button variant='ghost' size='icon' className='text-primary' aria-label={`Retirer ${participant.name}`}>
          <XIcon />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retirer {participant.name} ?</DialogTitle>
          <DialogDescription>
            {participant.name} ne fera plus partie du Secret Santa.
            {partners.length > 0 && ` ${formatPairs(participant.name, partners)}`}
          </DialogDescription>
        </DialogHeader>
        <FieldError>{error}</FieldError>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline'>Annuler</Button>
          </DialogClose>
          <Button onClick={() => void remove()} disabled={pending}>
            Retirer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatPairs(name: string, partners: (string | undefined)[]) {
  const pairs = partners.map((partner) => `${name} & ${partner}`).join(', ');
  return partners.length === 1
    ? `Le couple ${pairs} sera aussi retiré de la liste « Ils ne peuvent pas se tirer entre eux ».`
    : `Les couples ${pairs} seront aussi retirés de la liste « Ils ne peuvent pas se tirer entre eux ».`;
}
