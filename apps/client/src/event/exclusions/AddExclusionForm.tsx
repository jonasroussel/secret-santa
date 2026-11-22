import type { Exclusion, Participant } from '@secret-santa/shared';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';
import { api } from '@/lib/api.ts';
import { errorMessage } from '@/lib/errors.ts';

const samePerson = 'Choisis deux personnes différentes.';

type Props = {
  participants: Participant[];
  onAdded: (exclusion: Exclusion) => void;
  onCancel: () => void;
};

export function AddExclusionForm({ participants, onAdded, onCancel }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const data = new FormData(formEvent.currentTarget);
    const first = Number(data.get('first'));
    const second = Number(data.get('second'));
    if (first === second) {
      setError(samePerson);
      return;
    }
    setPending(true);
    setError(null);
    const result = await api<Exclusion>('/api/event/exclusions', {
      method: 'POST',
      body: { participantIds: [first, second] },
    });
    setPending(false);
    if (result.ok) onAdded(result.data);
    else setError(errorMessage(result.error, { invalid_input: samePerson }));
  }

  return (
    <form onSubmit={submit} onInput={() => setError(null)} className='bg-card border-border rounded-lg border p-4'>
      <FieldGroup className='gap-4'>
        <PersonSelect name='first' label='Première personne' participants={participants} />
        <PersonSelect name='second' label='Deuxième personne' participants={participants} />
        <FieldError>{error}</FieldError>
        <div className='grid grid-cols-2 gap-2'>
          <Button type='button' variant='outline' onClick={onCancel}>
            Annuler
          </Button>
          <Button type='submit' variant='secondary' disabled={pending}>
            Ajouter
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function PersonSelect({ name, label, participants }: { name: string; label: string; participants: Participant[] }) {
  const id = `exclusion-${name}`;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect id={id} name={name} required defaultValue=''>
        <option value='' disabled>
          Choisir…
        </option>
        {participants.map((participant) => (
          <option key={participant.id} value={participant.id}>
            {participant.name}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
}
