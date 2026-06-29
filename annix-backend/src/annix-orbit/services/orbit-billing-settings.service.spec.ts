import { BadRequestException } from "@nestjs/common";
import type { Connection } from "mongoose";
import { ORBIT_BILLING_MODULES, type OrbitBillingModule } from "../annix-orbit-billing.config";
import { OrbitBillingSettingsService } from "./orbit-billing-settings.service";

const BILLING_ENV_KEYS = [
  "ORBIT_SEEKER_BILLING_ENABLED",
  "ORBIT_COMPANY_BILLING_ENABLED",
  "ORBIT_RECRUITER_BILLING_ENABLED",
  "ORBIT_STUDENT_BILLING_ENABLED",
] as const;

function clearBillingEnv() {
  for (const key of BILLING_ENV_KEYS) {
    delete process.env[key];
  }
}

function setByPath(doc: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split(".");
  let cursor = doc;
  for (const part of parts.slice(0, -1)) {
    const existing = cursor[part];
    if (typeof existing === "object" && existing !== null && !Array.isArray(existing)) {
      cursor = existing as Record<string, unknown>;
      continue;
    }
    cursor[part] = {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1] ?? path] = value;
}

function makeService(initialDoc: Record<string, unknown> | null = null) {
  let doc = initialDoc;
  const collection = {
    findOne: jest.fn(async () => doc),
    updateOne: jest.fn(async (_filter, update: { $set?: Record<string, unknown> }) => {
      doc = doc ?? { _id: "default" };
      for (const [path, value] of Object.entries(update.$set ?? {})) {
        setByPath(doc, path, value);
      }
      return { acknowledged: true };
    }),
  };
  const connection = {
    db: {
      collection: jest.fn(() => collection),
    },
  } as unknown as Connection;

  return {
    service: new OrbitBillingSettingsService(connection),
    collection,
    doc: () => doc,
  };
}

describe("OrbitBillingSettingsService", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    clearBillingEnv();
  });

  it("defaults every Orbit billing module off when no env or admin override is set", async () => {
    clearBillingEnv();
    const { service } = makeService();

    await expect(service.enabled("seeker")).resolves.toBe(false);
    await expect(service.settings()).resolves.toEqual({
      modules: ORBIT_BILLING_MODULES.map((module) => ({
        module,
        enabled: false,
        envDefault: false,
        persisted: false,
      })),
    });
  });

  it("uses module-specific env defaults until an admin override exists", async () => {
    clearBillingEnv();
    process.env.ORBIT_SEEKER_BILLING_ENABLED = "true";
    const envDefault = makeService();
    await expect(envDefault.service.enabled("seeker")).resolves.toBe(true);

    const { service } = makeService({
      _id: "default",
      billingEnabled: { seeker: false } satisfies Partial<Record<OrbitBillingModule, boolean>>,
    });

    await expect(service.enabled("seeker")).resolves.toBe(false);
    await expect(service.enabled("company")).resolves.toBe(false);
  });

  it("persists admin toggles in the shared Orbit settings document", async () => {
    clearBillingEnv();
    const { service, doc } = makeService();

    const settings = await service.setEnabled("company", true);

    expect(doc()).toEqual(
      expect.objectContaining({
        _id: "default",
        billingEnabled: { company: true },
        updatedAt: expect.any(Date),
      }),
    );
    expect(settings.modules).toContainEqual({
      module: "company",
      enabled: true,
      envDefault: false,
      persisted: true,
    });
  });

  it("rejects unknown modules", async () => {
    const { service } = makeService();

    await expect(service.setEnabled("unknown", true)).rejects.toBeInstanceOf(BadRequestException);
  });
});
