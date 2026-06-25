import { assertAnnixOrbitWhatsAppQuotaGateConfigured } from "./annix-orbit-quota-gate.config";

describe("assertAnnixOrbitWhatsAppQuotaGateConfigured (issue #398 finding 3, fix 5)", () => {
  const originalGate = process.env.ORBIT_WHATSAPP_QUOTA_GATE;
  const originalSecret = process.env.WHATSAPP_APP_SECRET;

  afterEach(() => {
    if (originalGate === undefined) {
      delete process.env.ORBIT_WHATSAPP_QUOTA_GATE;
    } else {
      process.env.ORBIT_WHATSAPP_QUOTA_GATE = originalGate;
    }
    if (originalSecret === undefined) {
      delete process.env.WHATSAPP_APP_SECRET;
    } else {
      process.env.WHATSAPP_APP_SECRET = originalSecret;
    }
  });

  it("does nothing when the gate is off", () => {
    delete process.env.ORBIT_WHATSAPP_QUOTA_GATE;
    delete process.env.WHATSAPP_APP_SECRET;

    expect(() => assertAnnixOrbitWhatsAppQuotaGateConfigured()).not.toThrow();
  });

  it("throws when the gate is on but the webhook secret is missing", () => {
    process.env.ORBIT_WHATSAPP_QUOTA_GATE = "true";
    delete process.env.WHATSAPP_APP_SECRET;

    expect(() => assertAnnixOrbitWhatsAppQuotaGateConfigured()).toThrow(/WHATSAPP_APP_SECRET/);
  });

  it("throws when the gate is on but the webhook secret is blank", () => {
    process.env.ORBIT_WHATSAPP_QUOTA_GATE = "true";
    process.env.WHATSAPP_APP_SECRET = "   ";

    expect(() => assertAnnixOrbitWhatsAppQuotaGateConfigured()).toThrow(/WHATSAPP_APP_SECRET/);
  });

  it("passes when the gate is on and the webhook secret is set", () => {
    process.env.ORBIT_WHATSAPP_QUOTA_GATE = "true";
    process.env.WHATSAPP_APP_SECRET = "valid-secret";

    expect(() => assertAnnixOrbitWhatsAppQuotaGateConfigured()).not.toThrow();
  });
});
