import type {
  EventDetails,
  Exclusion,
  ExclusionInput,
  Participant,
  ParticipantInput,
  SecretSantaEvent,
} from '@secret-santa/shared';

import { Validation } from '../domain/validation.ts';
import type { EventRepository } from '../infrastructure/database/event-repository.ts';
import { fail, ok, type Result } from './result.ts';

/** After the draw the list is locked: only a participant's email can still be corrected. */
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
    if (repository.isDrawn()) return fail('draw_locked');
    const participant = repository.addParticipant(name, Validation.nameKey(name), email);
    return participant ? ok(participant) : fail('duplicate_name');
  }

  static updateParticipant(
    repository: EventRepository,
    id: number,
    { name, email }: ParticipantInput,
  ): Result<Participant> {
    if (repository.isDrawn()) {
      const current = repository.findParticipant(id);
      if (!current) return fail('not_found');
      if (current.name !== name) return fail('draw_locked');
    }
    const result = repository.updateParticipant(id, name, Validation.nameKey(name), email);
    return typeof result === 'string' ? fail(result) : ok(result);
  }

  /** Its exclusions go with it (ON DELETE CASCADE). */
  static removeParticipant(repository: EventRepository, id: number): Result<void> {
    if (repository.isDrawn()) return fail('draw_locked');
    repository.deleteParticipant(id);
    return ok(undefined);
  }

  static addExclusion(repository: EventRepository, { participantIds }: ExclusionInput): Result<Exclusion> {
    if (repository.isDrawn()) return fail('draw_locked');
    if (!participantIds.every((id) => repository.participantExists(id))) return fail('invalid_input');
    const [first, second] = participantIds.toSorted((a, b) => a - b) as [number, number];
    const id = repository.addExclusion(first, second);
    return id === null ? fail('duplicate_exclusion') : ok({ id, participantIds: [first, second] });
  }

  static removeExclusion(repository: EventRepository, id: number): Result<void> {
    if (repository.isDrawn()) return fail('draw_locked');
    repository.deleteExclusion(id);
    return ok(undefined);
  }
}
