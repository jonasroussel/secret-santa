/** Error bodies always have this shape; the client turns the code into a French message. */
export type ApiError = {
  error:
    | 'not_found'
    | 'unauthorized'
    | 'invalid_input'
    | 'invalid_code'
    | 'too_many_requests'
    | 'duplicate_name'
    | 'duplicate_exclusion'
    | 'draw_locked'
    | 'not_drawn'
    | 'not_enough_participants'
    | 'draw_impossible'
    | 'draw_tested';
};

export type HealthResponse = {
  status: 'ok';
  version: string;
};

export type Session = {
  email: string;
  /** Participant mails go to the admins instead (a real test of the whole flow). */
  mailTestMode: boolean;
};

export type MailStatus = 'not_sent' | 'sent' | 'failed' | 'opened';

export type Participant = {
  id: number;
  name: string;
  email: string;
  mailStatus: MailStatus;
  /** ISO */
  mailSentAt: string | null;
  /** ISO */
  mailOpenedAt: string | null;
};

export type Exclusion = { id: number; participantIds: [number, number] };

export type EventDetails = {
  name: string;
  /** YYYY-MM-DD */
  date: string;
  /** Whole euros. */
  budget: number | null;
  /** The organizer's free text for the participant mails, max 1000 chars. */
  message: string | null;
};

export type SecretSantaEvent = EventDetails & {
  /** ISO, `null` until the draw. */
  drawnAt: string | null;
  /**
   * Mails of this draw went out in test mode (to the admins): with test mode off it cannot be sent for real, it has
   * to be cancelled and redone.
   */
  drawTested: boolean;
  participants: Participant[];
  exclusions: Exclusion[];
};

export type ParticipantInput = { name: string; email: string };

export type ExclusionInput = { participantIds: [number, number] };
