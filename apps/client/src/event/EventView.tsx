import type { SecretSantaEvent } from '@secret-santa/shared';
import { useState } from 'react';

import { EventSummary } from './EventSummary.tsx';
import { ExclusionsSection } from './exclusions/ExclusionsSection.tsx';
import { ParticipantsSection } from './participants/ParticipantsSection.tsx';

export function EventView({ initial }: { initial: SecretSantaEvent }) {
  const [event, setEvent] = useState(initial);

  return (
    <>
      <EventSummary event={event} setEvent={setEvent} />
      <ParticipantsSection event={event} setEvent={setEvent} />
      <ExclusionsSection event={event} setEvent={setEvent} />
    </>
  );
}
