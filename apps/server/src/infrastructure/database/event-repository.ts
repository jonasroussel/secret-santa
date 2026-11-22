import type { Database } from 'bun:sqlite';

import type { EventDetails, Exclusion, Participant, SecretSantaEvent } from '@secret-santa/shared';

export class EventRepository {
  readonly #database: Database;

  constructor(database: Database) {
    this.#database = database;
  }

  find(): SecretSantaEvent | null {
    const details = this.#database.query<EventDetails, []>('SELECT name, date, budget FROM event WHERE id = 1').get();
    if (!details) return null;
    const participants = this.#database
      .query<Participant, []>('SELECT id, name, email FROM participants ORDER BY id')
      .all();
    const exclusions = this.#database
      .query<{ id: number; first: number; second: number }, []>(
        'SELECT id, first_participant_id AS first, second_participant_id AS second FROM exclusions ORDER BY id',
      )
      .all()
      .map(({ id, first, second }): Exclusion => ({ id, participantIds: [first, second] }));
    return { ...details, participants, exclusions };
  }

  exists(): boolean {
    return this.#database.query('SELECT 1 FROM event WHERE id = 1').get() !== null;
  }

  save({ name, date, budget }: EventDetails): void {
    this.#database.run(
      `INSERT INTO event (id, name, date, budget) VALUES (1, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET name = excluded.name, date = excluded.date, budget = excluded.budget`,
      [name, date, budget],
    );
  }

  /** `null` when another participant has the same name key. */
  addParticipant(name: string, nameKey: string, email: string): Participant | null {
    return this.#database
      .query<Participant, [string, string, string]>(
        `INSERT INTO participants (name, name_key, email) VALUES (?, ?, ?)
         ON CONFLICT (name_key) DO NOTHING RETURNING id, name, email`,
      )
      .get(name, nameKey, email);
  }

  /** `'not_found'`, or `'duplicate_name'` when another participant has the same name key. */
  updateParticipant(
    id: number,
    name: string,
    nameKey: string,
    email: string,
  ): Participant | 'not_found' | 'duplicate_name' {
    const other = this.#database
      .query<{ id: number }, [string]>('SELECT id FROM participants WHERE name_key = ?')
      .get(nameKey);
    if (other && other.id !== id) return 'duplicate_name';
    return (
      this.#database
        .query<Participant, [string, string, string, number]>(
          'UPDATE participants SET name = ?, name_key = ?, email = ? WHERE id = ? RETURNING id, name, email',
        )
        .get(name, nameKey, email, id) ?? 'not_found'
    );
  }

  deleteParticipant(id: number): void {
    this.#database.run('DELETE FROM participants WHERE id = ?', [id]);
  }

  participantExists(id: number): boolean {
    return this.#database.query('SELECT 1 FROM participants WHERE id = ?').get(id) !== null;
  }

  /** `null` when the pair already exists. */
  addExclusion(first: number, second: number): number | null {
    return (
      this.#database
        .query<{ id: number }, [number, number]>(
          `INSERT INTO exclusions (first_participant_id, second_participant_id) VALUES (?, ?)
           ON CONFLICT DO NOTHING RETURNING id`,
        )
        .get(first, second)?.id ?? null
    );
  }

  deleteExclusion(id: number): void {
    this.#database.run('DELETE FROM exclusions WHERE id = ?', [id]);
  }
}
