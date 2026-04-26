import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DEFAULT_DEV_PORT,
  normaliseHost,
  portalForHost,
} from "@annix/product-data/portals";

@Injectable()
export class PasskeyConfig {
  constructor(private readonly configService: ConfigService) {}

  rpId(requestHost?: string | null): string {
    const fromHost = this.rpIdFromHost(requestHost);
    if (fromHost) return fromHost;
    return this.configService.get<string>("WEBAUTHN_RP_ID") || "localhost";
  }

  rpName(): string {
    return this.configService.get<string>("WEBAUTHN_RP_NAME") || "Annix";
  }

  origins(requestHost?: string | null): string[] {
    const fromHost = this.originsFromHost(requestHost);
    if (fromHost) return fromHost;
    const raw = this.configService.get<string>("WEBAUTHN_ORIGIN") || "http://localhost:3000";
    return raw
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  challengeTtlSeconds(): number {
    return 5 * 60;
  }

  private rpIdFromHost(requestHost: string | null | undefined): string | null {
    if (!requestHost) return null;
    const portal = portalForHost(requestHost);
    if (!portal) return null;
    const normalised = normaliseHost(requestHost);
    return normalised === portal.devHost ? portal.devHost : portal.prodHost;
  }

  private originsFromHost(requestHost: string | null | undefined): string[] | null {
    if (!requestHost) return null;
    const portal = portalForHost(requestHost);
    if (!portal) return null;
    return [
      `http://${portal.devHost}:${DEFAULT_DEV_PORT}`,
      `https://${portal.prodHost}`,
      ...portal.prodHostAliases.map((alias) => `https://${alias}`),
    ];
  }
}
