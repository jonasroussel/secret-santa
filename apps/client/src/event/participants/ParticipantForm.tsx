import type { Participant, ParticipantInput } from '@secret-santa/shared';
import { type FormEvent, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type Props = {
  initial?: ParticipantInput;
  submitLabel: string;
  /** A new list clears the error, which may no longer hold. */
  participants?: Participant[];
  /** After the draw, only the email can be corrected. */
  emailOnly?: boolean;
  /** Resolves to an error message, or null on success. */
  onSubmit: (input: ParticipantInput) => Promise<string | null>;
};

export function ParticipantForm({ initial, submitLabel, participants, emailOnly, onSubmit }: Props) {
  const id = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorParticipants, setErrorParticipants] = useState(participants);
  if (errorParticipants !== participants) {
    setErrorParticipants(participants);
    setError(null);
  }

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = formEvent.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setError(null);
    const name = emailOnly ? initial!.name : String(data.get('name'));
    const message = await onSubmit({ name, email: String(data.get('email')) });
    setPending(false);
    setError(message);
    if (message === null) {
      form.reset();
      form.querySelector('input')?.focus();
    }
  }

  return (
    <form onSubmit={submit} onInput={() => setError(null)}>
      <FieldGroup className='gap-4'>
        {!emailOnly && (
          <Field>
            <FieldLabel htmlFor={`${id}-name`}>Prénom</FieldLabel>
            <Input
              id={`${id}-name`}
              name='name'
              required
              maxLength={50}
              autoComplete='off'
              defaultValue={initial?.name}
            />
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor={`${id}-email`}>Email</FieldLabel>
          <Input
            id={`${id}-email`}
            name='email'
            type='email'
            required
            autoComplete='off'
            defaultValue={initial?.email}
          />
        </Field>
        <FieldError>{error}</FieldError>
        <Button type='submit' variant='secondary' disabled={pending}>
          {submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
