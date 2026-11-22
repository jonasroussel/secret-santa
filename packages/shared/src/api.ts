/** Error bodies always have this shape; the client turns the code into a French message. */
export type ApiError = {
  error:
    | 'not_found'
    | 'unauthorized'
    | 'invalid_input'
    | 'invalid_link'
    | 'too_many_requests'
    | 'duplicate_name'
    | 'duplicate_exclusion';
};

export type HealthResponse = {
  status: 'ok';
  version: string;
};

export type Session = { email: string };

export type Participant = { id: number; name: string; email: string };

export type Exclusion = { id: number; participantIds: [number, number] };

export type EventDetails = {
  name: string;
  /** YYYY-MM-DD */
  date: string;
  /** Whole euros. */
  budget: number | null;
};

export type SecretSantaEvent = EventDetails & { participants: Participant[]; exclusions: Exclusion[] };

export type ParticipantInput = { name: string; email: string };

export type ExclusionInput = { participantIds: [number, number] };
