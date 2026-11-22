export const config = {
  port: Number(Bun.env.PORT ?? 3629),
  databasePath: Bun.env.DATABASE_PATH ?? 'data/secret-santa.sqlite',
  /** Built client (`apps/client/dist`) to serve next to the API, so one port is enough. Unset in development. */
  clientDistPath: Bun.env.CLIENT_DIST_PATH ?? null,
};
