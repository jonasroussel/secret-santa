import type { EventDetails } from '@secret-santa/shared';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  initial?: EventDetails;
  submitLabel: string;
  /** Resolves to an error message, or null on success. */
  onSubmit: (details: EventDetails) => Promise<string | null>;
};

export function EventForm({ initial, submitLabel, onSubmit }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const budget = String(form.get('budget')).trim();
    const message = String(form.get('message')).trim();
    setPending(true);
    setError(null);
    const failure = await onSubmit({
      name: String(form.get('name')),
      date: String(form.get('date')),
      budget: budget === '' ? null : Number(budget),
      message: message === '' ? null : message,
    });
    setPending(false);
    setError(failure);
  }

  return (
    <form onSubmit={submit} onInput={() => setError(null)}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor='event-name'>Nom de l’événement</FieldLabel>
          <Input
            id='event-name'
            name='name'
            required
            maxLength={80}
            placeholder='Ex. : Noël 2026 chez Papi'
            defaultValue={initial?.name}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='event-date'>Date</FieldLabel>
          <Input id='event-date' name='date' type='date' required defaultValue={initial?.date} />
        </Field>
        <Field>
          <FieldLabel htmlFor='event-budget'>Budget par cadeau (€)</FieldLabel>
          <Input
            id='event-budget'
            name='budget'
            type='number'
            inputMode='numeric'
            min={1}
            max={10000}
            step={1}
            defaultValue={initial?.budget ?? ''}
          />
          <FieldDescription>Facultatif.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor='event-message'>Message pour les participants (facultatif)</FieldLabel>
          <Textarea id='event-message' name='message' maxLength={1000} defaultValue={initial?.message ?? ''} />
          <FieldDescription>Il apparaîtra dans le mail de chaque participant.</FieldDescription>
        </Field>
        <FieldError>{error}</FieldError>
        <Button type='submit' disabled={pending}>
          {submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
