import type { SecretSantaEvent } from '@secret-santa/shared';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api.ts';

import { CancelDrawDialog } from './draw/CancelDrawDialog.tsx';
import { DrawAnimation, type DrawAnimationState } from './draw/DrawAnimation.tsx';
import { DrawButton } from './draw/DrawButton.tsx';
import { DrawnPanel } from './draw/DrawnPanel.tsx';
import { EventSummary } from './EventSummary.tsx';
import { ExclusionsSection } from './exclusions/ExclusionsSection.tsx';
import { ParticipantsSection } from './participants/ParticipantsSection.tsx';
import type { MailSending } from './types.ts';

export function EventView({ initial, mailTestMode }: { initial: SecretSantaEvent; mailTestMode: boolean }) {
  const [event, setEvent] = useState(initial);
  // Mails of a draw the admins saw in test mode must not reach the real participants.
  const mailsBlocked = event.drawTested && !mailTestMode;
  // Lives here, not in DrawButton, so it can fade out over the drawn page that replaces the button.
  const [drawAnimation, setDrawAnimation] = useState<DrawAnimationState>(null);
  const [mailSending, setMailSending] = useState<MailSending>(null);
  const isSending = mailSending !== null;

  useEffect(() => {
    // A refresh during the sending loop would overwrite the rows it is updating.
    if (isSending) return;
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
  }, [isSending]);

  const sectionProps = { event, setEvent };
  return (
    <>
      {event.drawnAt === null ? (
        <>
          <EventSummary {...sectionProps} />
          <ParticipantsSection {...sectionProps} />
          <ExclusionsSection {...sectionProps} />
          <DrawButton {...sectionProps} setDrawAnimation={setDrawAnimation} />
        </>
      ) : (
        <>
          <EventSummary {...sectionProps} />
          <DrawnPanel
            {...sectionProps}
            mailsBlocked={mailsBlocked}
            mailSending={mailSending}
            setMailSending={setMailSending}
          />
          <ParticipantsSection {...sectionProps} mailsBlocked={mailsBlocked} mailSending={mailSending} />
          <ExclusionsSection {...sectionProps} />
          <CancelDrawDialog {...sectionProps} disabled={isSending} />
        </>
      )}
      {drawAnimation && (
        <DrawAnimation
          names={event.participants.map((participant) => participant.name)}
          leaving={drawAnimation === 'leaving'}
          setDrawAnimation={setDrawAnimation}
        />
      )}
    </>
  );
}
