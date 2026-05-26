import type { Abstract, Provider, Type } from "@nestjs/common";
import { activeDatabaseDriver, DatabaseDriver } from "./database-driver";

function notImplementedMongoRepository(name: string): unknown {
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "then") {
          return undefined;
        }
        return () => {
          throw new Error(
            `${name}: the MongoDB implementation is not in place yet (migration #298)`,
          );
        };
      },
    },
  );
}

export function repositoryProvider(
  token: Abstract<unknown>,
  postgres: Type<unknown>,
  mongo?: Type<unknown>,
): Provider {
  if (activeDatabaseDriver() === DatabaseDriver.Postgres) {
    return { provide: token, useClass: postgres };
  }
  if (mongo) {
    return { provide: token, useClass: mongo };
  }
  return {
    provide: token,
    useFactory: () => notImplementedMongoRepository(token.name),
  };
}
