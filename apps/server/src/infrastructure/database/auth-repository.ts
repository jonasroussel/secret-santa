import type { Database } from 'bun:sqlite';

export class AuthRepository {
  readonly #database: Database;

  constructor(database: Database) {
    this.#database = database;
  }

  addLoginToken(tokenHash: string, email: string, expiresAt: number, now: number): void {
    this.#database.run('DELETE FROM login_tokens WHERE expires_at <= ?', [now]);
    this.#database.run('INSERT INTO login_tokens (token_hash, email, expires_at) VALUES (?, ?, ?)', [
      tokenHash,
      email,
      expiresAt,
    ]);
  }

  /** Marks the token used and returns its email, or `null` when it is unknown, used or expired. */
  useLoginToken(tokenHash: string, now: number): string | null {
    const row = this.#database
      .query<{ email: string }, [number, string, number]>(
        `UPDATE login_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
         RETURNING email`,
      )
      .get(now, tokenHash, now);
    return row?.email ?? null;
  }

  addSession(tokenHash: string, email: string, expiresAt: number, now: number): void {
    this.#database.run('DELETE FROM sessions WHERE expires_at <= ?', [now]);
    this.#database.run('INSERT INTO sessions (token_hash, email, expires_at) VALUES (?, ?, ?)', [
      tokenHash,
      email,
      expiresAt,
    ]);
  }

  sessionEmail(tokenHash: string, now: number): string | null {
    const row = this.#database
      .query<{ email: string }, [string, number]>('SELECT email FROM sessions WHERE token_hash = ? AND expires_at > ?')
      .get(tokenHash, now);
    return row?.email ?? null;
  }

  deleteSession(tokenHash: string): void {
    this.#database.run('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
  }
}
