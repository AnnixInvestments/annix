import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PasskeyConfig {
  constructor(private readonly configService: ConfigService) {}

  rpId(): string {
    return this.configService.get<string>("WEBAUTHN_RP_ID") || "localhost";
  }

  rpName(): string {
    return this.configService.get<string>("WEBAUTHN_RP_NAME") || "Annix";
  }

  origins(): string[] {
    const raw = this.configService.get<string>("WEBAUTHN_ORIGIN") || "http://localhost:3000";
    return raw
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  challengeTtlSeconds(): number {
    return 5 * 60;
  }
}
