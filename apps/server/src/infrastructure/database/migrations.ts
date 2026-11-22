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
  // Sign-in by a 6-digit code instead of a link: one active code per email, deleted once used or after 5 failures.
  `
  DROP TABLE login_tokens;
  CREATE TABLE login_codes (
    email TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0
  );
  `,
  // The draw: who gives to whom (never shown to the organizer) and the mail sent to each giver. Cancelling the draw
  // deletes the assignments; `received_cancelled_draw` remembers who got a mail of a cancelled draw.
  `
  ALTER TABLE event ADD COLUMN message TEXT;
  ALTER TABLE event ADD COLUMN drawn_at INTEGER;
  ALTER TABLE participants ADD COLUMN received_cancelled_draw INTEGER NOT NULL DEFAULT 0;
  CREATE TABLE assignments (
    giver_id INTEGER PRIMARY KEY REFERENCES participants (id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL UNIQUE REFERENCES participants (id) ON DELETE CASCADE,
    mail_status TEXT NOT NULL DEFAULT 'not_sent' CHECK (mail_status IN ('not_sent', 'sent', 'failed', 'opened')),
    mail_token_hash TEXT UNIQUE,
    mail_sent_at INTEGER,
    mail_opened_at INTEGER,
    mail_error TEXT
  );
  `,
  // Whether a mail of this draw really reached the participant (not a failure, not test mode): only those get the
  // « tirage refait » notice when the draw is cancelled.
  `
  ALTER TABLE assignments ADD COLUMN delivered_to_participant INTEGER NOT NULL DEFAULT 0;
  `,
  // Sticky: a mail of this draw went to the admins in test mode, so they know its assignments; it must be redone.
  `
  ALTER TABLE assignments ADD COLUMN sent_in_test_mode INTEGER NOT NULL DEFAULT 0;
  `,
];
