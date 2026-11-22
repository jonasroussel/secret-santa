import type { Database } from 'bun:sqlite';

export class AuthRepository {
  readonly #database: Database;

  constructor(database: Database) {
    this.#database = database;
  }

  /** Replaces the previous code of this email, if any. */
  saveCode(email: string, codeHash: string, expiresAt: number): void {
    this.#database.run(
      `INSERT INTO login_codes (email, code_hash, expires_at) VALUES (?, ?, ?)
       ON CONFLICT (email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at,
         failed_attempts = 0`,
      [email, codeHash, expiresAt],
    );
  }

  findCode(email: string): { codeHash: string; expiresAt: number; failedAttempts: number } | null {
    return this.#database
      .query<{ codeHash: string; expiresAt: number; failedAttempts: number }, [string]>(
        `SELECT code_hash AS codeHash, expires_at AS expiresAt, failed_attempts AS failedAttempts
         FROM login_codes WHERE email = ?`,
      )
      .get(email);
  }

  countFailedAttempt(email: string): void {
    this.#database.run('UPDATE login_codes SET failed_attempts = failed_attempts + 1 WHERE email = ?', [email]);
  }

  deleteCode(email: string): void {
    this.#database.run('DELETE FROM login_codes WHERE email = ?', [email]);
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
