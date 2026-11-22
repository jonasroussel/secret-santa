/** SQL scripts, applied in order. Append new ones at the end; never edit or reorder an applied one. */
export const migrations: string[] = [
  // Tokens are stored as their SHA-256: a leaked database gives no usable link or session. Times are epoch ms.
  `
  CREATE TABLE login_tokens (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at INTEGER
  );
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  `,
];
