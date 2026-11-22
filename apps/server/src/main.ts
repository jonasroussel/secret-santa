import { createApp } from './app.ts';
import { Tokens } from './application/tokens.ts';
import { appVersion } from './infrastructure/app-version.ts';
import { systemClock } from './infrastructure/clock.ts';
import { config } from './infrastructure/config.ts';
import { createDatabase, migrate } from './infrastructure/database/connection.ts';
import { consoleMailer } from './infrastructure/mail/console-mailer.ts';
import { createSmtpMailer } from './infrastructure/mail/smtp-mailer.ts';
import { createStaticFiles } from './presentation/http/static-files.ts';

const database = createDatabase(config.databasePath);
const appliedMigrations = migrate(database);
if (appliedMigrations > 0) console.log(`Applied migrations: ${appliedMigrations}`);
if (config.adminEmails.size === 0) console.warn('ADMIN_EMAILS is empty: nobody can sign in.');

const version = await appVersion();
const notFound = () => Response.json({ error: 'not_found' }, { status: 404 });
const staticFiles = config.clientDistPath ? createStaticFiles(config.clientDistPath) : null;

const server = Bun.serve({
  port: config.port,
  routes: createApp({
    version,
    database,
    clock: systemClock,
    mailer: config.smtp ? createSmtpMailer(config.smtp) : consoleMailer,
    generateCode: config.production ? Tokens.code : () => '123456',
    secureCookie: config.production,
    adminEmails: config.adminEmails,
  }),
  // Unknown API paths stay JSON errors; everything else is the client, when it is served from here.
  fetch: (request) =>
    staticFiles && !new URL(request.url).pathname.startsWith('/api/') ? staticFiles(request) : notFound(),
});

console.log(`Server listening on ${server.url}`);
console.log(`Version: ${version}`);
