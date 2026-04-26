import { ConfigService } from "@nestjs/config";
import { PasskeyConfig } from "./passkey.config";

function configWith(values: Record<string, string | undefined>): PasskeyConfig {
  const configService = {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
  return new PasskeyConfig(configService);
}

describe("PasskeyConfig (host-aware)", () => {
  describe("rpId", () => {
    it("falls back to env when no host is provided", () => {
      const config = configWith({ WEBAUTHN_RP_ID: "annix.co.za" });
      expect(config.rpId()).toBe("annix.co.za");
    });

    it("falls back to 'localhost' default when env unset and no host provided", () => {
      const config = configWith({});
      expect(config.rpId()).toBe("localhost");
    });

    it("uses canonical prodHost as RP ID for production hosts", () => {
      const config = configWith({});
      expect(config.rpId("admin.annix.co.za")).toBe("admin.annix.co.za");
      expect(config.rpId("aurubber.co.za")).toBe("aurubber.co.za");
    });

    it("collapses www aliases to the canonical prodHost", () => {
      const config = configWith({});
      expect(config.rpId("www.aurubber.co.za")).toBe("aurubber.co.za");
      expect(config.rpId("www.auind.co.za")).toBe("auind.co.za");
    });

    it("uses devHost as RP ID for *.localhost development hosts", () => {
      const config = configWith({});
      expect(config.rpId("admin.localhost:3000")).toBe("admin.localhost");
      expect(config.rpId("aurubber.localhost:3000")).toBe("aurubber.localhost");
    });

    it("falls back to env for unknown hosts", () => {
      const config = configWith({ WEBAUTHN_RP_ID: "annix.co.za" });
      expect(config.rpId("evil.example.com")).toBe("annix.co.za");
    });
  });

  describe("origins", () => {
    it("falls back to env list when no host is provided", () => {
      const config = configWith({
        WEBAUTHN_ORIGIN: "https://annix.co.za,https://admin.annix.co.za",
      });
      expect(config.origins()).toEqual(["https://annix.co.za", "https://admin.annix.co.za"]);
    });

    it("returns only the matched portal's dev + prod + alias origins for a known host", () => {
      const config = configWith({});
      expect(config.origins("aurubber.localhost:3000")).toEqual([
        "http://aurubber.localhost:3000",
        "https://aurubber.co.za",
        "https://www.aurubber.co.za",
      ]);
    });

    it("works for an admin production host (no aliases)", () => {
      const config = configWith({});
      expect(config.origins("admin.annix.co.za")).toEqual([
        "http://admin.localhost:3000",
        "https://admin.annix.co.za",
      ]);
    });

    it("falls back to env for unknown hosts", () => {
      const config = configWith({ WEBAUTHN_ORIGIN: "http://localhost:3000" });
      expect(config.origins("evil.example.com")).toEqual(["http://localhost:3000"]);
    });
  });

  describe("rpName", () => {
    it("returns env value when set", () => {
      const config = configWith({ WEBAUTHN_RP_NAME: "Annix Custom" });
      expect(config.rpName()).toBe("Annix Custom");
    });

    it("defaults to 'Annix'", () => {
      expect(configWith({}).rpName()).toBe("Annix");
    });
  });
});
