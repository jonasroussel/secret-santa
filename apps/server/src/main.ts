import { createApp } from './app.ts';
import { appVersion } from './infrastructure/app-version.ts';
import { config } from './infrastructure/config.ts';
import { createDatabase, migrate } from './infrastructure/database/connection.ts';
import { createStaticFiles } from './presentation/http/static-files.ts';

const database = createDatabase(config.databasePath);
const appliedMigrations = migrate(database);
if (appliedMigrations > 0) console.log(`Applied migrations: ${appliedMigrations}`);

const version = await appVersion();
const notFound = () => Response.json({ error: 'not_found' }, { status: 404 });
const staticFiles = config.clientDistPath ? createStaticFiles(config.clientDistPath) : null;

const server = Bun.serve({
  port: config.port,
  routes: createApp(version),
  // Unknown API paths stay JSON errors; everything else is the client, when it is served from here.
  fetch: (request) =>
    staticFiles && !new URL(request.url).pathname.startsWith('/api/') ? staticFiles(request) : notFound(),
});

console.log(`Server listening on ${server.url}`);
console.log(`Version: ${version}`);
