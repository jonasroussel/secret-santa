import type { Database } from 'bun:sqlite';

import type { EventDetails, Exclusion, Participant, SecretSantaEvent } from '@secret-santa/shared';

type ParticipantRow = Omit<Participant, 'mailSentAt' | 'mailOpenedAt'> & {
  mailSentAt: number | null;
  mailOpenedAt: number | null;
};

/** Everything the organizer may see of a participant: the mail status, never the receiver. */
const PARTICIPANT_SELECT = `
  SELECT p.id, p.name, p.email, COALESCE(a.mail_status, 'not_sent') AS mailStatus, a.mail_sent_at AS mailSentAt,
    a.mail_opened_at AS mailOpenedAt
  FROM participants p LEFT JOIN assignments a ON a.giver_id = p.id`;

export type MailToSend = {
  giverId: number;
  giverName: string;
  giverEmail: string;
  receiverName: string;
  receivedCancelledDraw: boolean;
};

export class EventRepository {
  readonly #database: Database;

  constructor(database: Database) {
    this.#database = database;
  }

  find(): SecretSantaEvent | null {
    const event = this.#database
      .query<EventDetails & { drawnAt: number | null }, []>(
        'SELECT name, date, budget, message, drawn_at AS drawnAt FROM event WHERE id = 1',
      )
      .get();
    if (!event) return null;
    const participants = this.#database
      .query<ParticipantRow, []>(`${PARTICIPANT_SELECT} ORDER BY p.id`)
      .all()
      .map(EventRepository.#toParticipant);
    const exclusions = this.#database
      .query<{ id: number; first: number; second: number }, []>(
        'SELECT id, first_participant_id AS first, second_participant_id AS second FROM exclusions ORDER BY id',
      )
      .all()
      .map(({ id, first, second }): Exclusion => ({ id, participantIds: [first, second] }));
    return { ...event, drawnAt: EventRepository.#iso(event.drawnAt), participants, exclusions };
  }

  exists(): boolean {
    return this.#database.query('SELECT 1 FROM event WHERE id = 1').get() !== null;
  }

  isDrawn(): boolean {
    return this.#database.query('SELECT 1 FROM event WHERE id = 1 AND drawn_at IS NOT NULL').get() !== null;
  }

  save({ name, date, budget, message }: EventDetails): void {
    this.#database.run(
      `INSERT INTO event (id, name, date, budget, message) VALUES (1, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET name = excluded.name, date = excluded.date, budget = excluded.budget,
         message = excluded.message`,
      [name, date, budget, message],
    );
  }

  findParticipant(id: number): Participant | null {
    const row = this.#database.query<ParticipantRow, [number]>(`${PARTICIPANT_SELECT} WHERE p.id = ?`).get(id);
    return row && EventRepository.#toParticipant(row);
  }

  /** `null` when another participant has the same name key. */
  addParticipant(name: string, nameKey: string, email: string): Participant | null {
    const row = this.#database
      .query<{ id: number }, [string, string, string]>(
        `INSERT INTO participants (name, name_key, email) VALUES (?, ?, ?)
         ON CONFLICT (name_key) DO NOTHING RETURNING id`,
      )
      .get(name, nameKey, email);
    return row && this.findParticipant(row.id);
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
    this.#database.run('UPDATE participants SET name = ?, name_key = ?, email = ? WHERE id = ?', [
      name,
      nameKey,
      email,
      id,
    ]);
    return this.findParticipant(id) ?? 'not_found';
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

  saveDraw(assignments: Map<number, number>, now: number): void {
    this.#database.transaction(() => {
      const insert = this.#database.query('INSERT INTO assignments (giver_id, receiver_id) VALUES (?, ?)');
      for (const [giver, receiver] of assignments) insert.run(giver, receiver);
      this.#database.run('UPDATE event SET drawn_at = ? WHERE id = 1', [now]);
    })();
  }

  cancelDraw(): void {
    this.#database.transaction(() => {
      this.#database.run(
        `UPDATE participants SET received_cancelled_draw = 1
         WHERE id IN (SELECT giver_id FROM assignments WHERE mail_status IN ('sent', 'opened'))`,
      );
      this.#database.run('DELETE FROM assignments');
      this.#database.run('UPDATE event SET drawn_at = NULL WHERE id = 1');
    })();
  }

  mailToSend(giverId: number): MailToSend | null {
    const row = this.#database
      .query<Omit<MailToSend, 'receivedCancelledDraw'> & { receivedCancelledDraw: number }, [number]>(
        `SELECT a.giver_id AS giverId, giver.name AS giverName, giver.email AS giverEmail,
           receiver.name AS receiverName, giver.received_cancelled_draw AS receivedCancelledDraw
         FROM assignments a
         JOIN participants giver ON giver.id = a.giver_id
         JOIN participants receiver ON receiver.id = a.receiver_id
         WHERE a.giver_id = ?`,
      )
      .get(giverId);
    return row && { ...row, receivedCancelledDraw: row.receivedCancelledDraw === 1 };
  }

  recordMailSent(giverId: number, tokenHash: string, now: number): void {
    this.#database.run(
      `UPDATE assignments SET mail_status = 'sent', mail_token_hash = ?, mail_sent_at = ?, mail_opened_at = NULL,
         mail_error = NULL
       WHERE giver_id = ?`,
      [tokenHash, now, giverId],
    );
  }

  recordMailFailed(giverId: number, error: string): void {
    this.#database.run(
      `UPDATE assignments SET mail_status = 'failed', mail_token_hash = NULL, mail_sent_at = NULL,
         mail_opened_at = NULL, mail_error = ?
       WHERE giver_id = ?`,
      [error, giverId],
    );
  }

  /** Only the first open of the participant's current mail counts. */
  recordMailOpened(tokenHash: string, now: number): void {
    this.#database.run(
      `UPDATE assignments SET mail_status = 'opened', mail_opened_at = ?
       WHERE mail_token_hash = ? AND mail_status = 'sent'`,
      [now, tokenHash],
    );
  }

  static #toParticipant(row: ParticipantRow): Participant {
    return {
      ...row,
      mailSentAt: EventRepository.#iso(row.mailSentAt),
      mailOpenedAt: EventRepository.#iso(row.mailOpenedAt),
    };
  }

  static #iso(time: number | null): string | null {
    return time === null ? null : new Date(time).toISOString();
  }
}
