import { InternalServerErrorException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

export function resolveAnnixOrbitJwtSecret(configService: ConfigService): string {
  const secret =
    configService.get<string>("ANNIX_ORBIT_JWT_SECRET") ??
    configService.get<string>("CV_ASSISTANT_JWT_SECRET");
  if (!secret || secret.length === 0) {
    throw new InternalServerErrorException("Annix Orbit JWT secret is not configured");
  }
  return secret;
}
