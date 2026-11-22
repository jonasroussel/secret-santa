import type {
  ApiError,
  EventDetails,
  Exclusion,
  ExclusionInput,
  Participant,
  ParticipantInput,
  SecretSantaEvent,
} from '@secret-santa/shared';

import { Validation } from '../domain/validation.ts';
import type { EventRepository } from '../infrastructure/database/event-repository.ts';

type Result<T> = { ok: true; value: T } | { ok: false; error: ApiError['error'] };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (error: ApiError['error']): Result<never> => ({ ok: false, error });

export class EventUseCase {
  static get(repository: EventRepository): Result<SecretSantaEvent> {
    const event = repository.find();
    return event ? ok(event) : fail('not_found');
  }

  static save(repository: EventRepository, details: EventDetails): SecretSantaEvent {
    repository.save(details);
    return repository.find()!;
  }

  static addParticipant(repository: EventRepository, { name, email }: ParticipantInput): Result<Participant> {
    if (!repository.exists()) return fail('not_found');
    const participant = repository.addParticipant(name, Validation.nameKey(name), email);
    return participant ? ok(participant) : fail('duplicate_name');
  }

  static updateParticipant(
    repository: EventRepository,
    id: number,
    { name, email }: ParticipantInput,
  ): Result<Participant> {
    const result = repository.updateParticipant(id, name, Validation.nameKey(name), email);
    return typeof result === 'string' ? fail(result) : ok(result);
  }

  /** Its exclusions go with it (ON DELETE CASCADE). */
  static removeParticipant(repository: EventRepository, id: number): void {
    repository.deleteParticipant(id);
  }

  static addExclusion(repository: EventRepository, { participantIds }: ExclusionInput): Result<Exclusion> {
    if (!participantIds.every((id) => repository.participantExists(id))) return fail('invalid_input');
    const [first, second] = participantIds.toSorted((a, b) => a - b) as [number, number];
    const id = repository.addExclusion(first, second);
    return id === null ? fail('duplicate_exclusion') : ok({ id, participantIds: [first, second] });
  }

  static removeExclusion(repository: EventRepository, id: number): void {
    repository.deleteExclusion(id);
  }
}
