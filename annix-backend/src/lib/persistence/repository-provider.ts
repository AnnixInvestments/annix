import type { Abstract, Provider, Type } from "@nestjs/common";

export function repositoryProvider(token: Abstract<unknown>, mongo: Type<unknown>): Provider {
  return { provide: token, useClass: mongo };
}
