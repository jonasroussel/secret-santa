import type { SecretSantaEvent } from '@secret-santa/shared';
import type { Dispatch, SetStateAction } from 'react';

export type EventSectionProps = {
  event: SecretSantaEvent;
  setEvent: Dispatch<SetStateAction<SecretSantaEvent>>;
};
