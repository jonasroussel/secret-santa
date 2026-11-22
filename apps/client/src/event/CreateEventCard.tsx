import type { EventDetails, SecretSantaEvent } from '@secret-santa/shared';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api.ts';
import { errorMessage } from '@/lib/errors.ts';

import { EventForm } from './EventForm.tsx';

export function CreateEventCard({ onCreated }: { onCreated: (event: SecretSantaEvent) => void }) {
  async function create(details: EventDetails) {
    const result = await api<SecretSantaEvent>('/api/event', { method: 'PUT', body: details });
    if (!result.ok) return errorMessage(result.error);
    onCreated(result.data);
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-primary text-2xl'>Votre Secret Santa</CardTitle>
        <CardDescription className='text-base'>
          Commencez par lui donner un nom et une date. Vous ajouterez ensuite les participants.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EventForm submitLabel='Créer l’événement' onSubmit={create} />
      </CardContent>
    </Card>
  );
}
