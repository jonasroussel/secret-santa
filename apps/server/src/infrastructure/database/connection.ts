import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { migrations } from './migrations.ts';

export function createDatabase(filename: string): Database {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const database = new Database(filename, { strict: true });
  database.run('PRAGMA foreign_keys = ON');
  database.run('PRAGMA journal_mode = WAL');
  database.run('PRAGMA busy_timeout = 5000');
  return database;
}

/** Runs the migrations not applied yet, each in its own transaction. `user_version` counts the applied ones. */
export function migrate(database: Database): number {
  const { user_version: applied } = database.query<{ user_version: number }, []>('PRAGMA user_version').get()!;
  for (let version = applied + 1; version <= migrations.length; version++) {
    database.transaction(() => {
      database.run(migrations[version - 1]!);
      database.run(`PRAGMA user_version = ${version}`);
    })();
  }
  return migrations.length - applied;
}
