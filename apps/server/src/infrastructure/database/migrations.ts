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
  // A single event, hence the fixed id. `name_key` is the name without case, accents or spaces, to refuse duplicates.
  // An exclusion pair is stored smaller id first, so the UNIQUE constraint covers both orders.
  `
  CREATE TABLE event (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    budget INTEGER
  );
  CREATE TABLE participants (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL
  );
  CREATE TABLE exclusions (
    id INTEGER PRIMARY KEY,
    first_participant_id INTEGER NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
    second_participant_id INTEGER NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
    UNIQUE (first_participant_id, second_participant_id),
    CHECK (first_participant_id < second_participant_id)
  );
  `,
];
