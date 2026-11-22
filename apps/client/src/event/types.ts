import type { SecretSantaEvent } from '@secret-santa/shared';
import type { Dispatch, SetStateAction } from 'react';

export type EventSectionProps = {
  event: SecretSantaEvent;
  setEvent: Dispatch<SetStateAction<SecretSantaEvent>>;
};

/** Progress of « Envoyer les mails », one participant at a time; null when idle. */
export type MailSending = { participantId: number; position: number; total: number } | null;
