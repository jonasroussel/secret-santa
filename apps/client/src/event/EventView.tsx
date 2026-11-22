import type { SecretSantaEvent } from '@secret-santa/shared';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api.ts';

import { CancelDrawDialog } from './draw/CancelDrawDialog.tsx';
import { DrawButton } from './draw/DrawButton.tsx';
import { DrawnPanel } from './draw/DrawnPanel.tsx';
import { EventSummary } from './EventSummary.tsx';
import { ExclusionsSection } from './exclusions/ExclusionsSection.tsx';
import { ParticipantsSection } from './participants/ParticipantsSection.tsx';

export function EventView({ initial }: { initial: SecretSantaEvent }) {
  const [event, setEvent] = useState(initial);

  useEffect(() => {
    async function refresh() {
      if (document.visibilityState !== 'visible') return;
      const result = await api<SecretSantaEvent>('/api/event');
      if (result.ok) setEvent(result.data);
    }
    const onRefresh = () => void refresh();
    window.addEventListener('focus', onRefresh);
    document.addEventListener('visibilitychange', onRefresh);
    return () => {
      window.removeEventListener('focus', onRefresh);
      document.removeEventListener('visibilitychange', onRefresh);
    };
  }, []);

  const sectionProps = { event, setEvent };
  return event.drawnAt === null ? (
    <>
      <EventSummary {...sectionProps} />
      <ParticipantsSection {...sectionProps} />
      <ExclusionsSection {...sectionProps} />
      <DrawButton {...sectionProps} />
    </>
  ) : (
    <>
      <EventSummary {...sectionProps} />
      <DrawnPanel {...sectionProps} />
      <ParticipantsSection {...sectionProps} />
      <ExclusionsSection {...sectionProps} />
      <CancelDrawDialog {...sectionProps} />
    </>
  );
}
