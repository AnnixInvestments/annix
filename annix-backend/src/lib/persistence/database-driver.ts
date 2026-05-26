export enum DatabaseDriver {
  Postgres = "postgres",
  Mongo = "mongo",
}

export function activeDatabaseDriver(): DatabaseDriver {
  if (process.env.DATABASE_DRIVER === DatabaseDriver.Mongo) {
    return DatabaseDriver.Mongo;
  }
  return DatabaseDriver.Postgres;
}

export function isMongoDriver(): boolean {
  return activeDatabaseDriver() === DatabaseDriver.Mongo;
}
