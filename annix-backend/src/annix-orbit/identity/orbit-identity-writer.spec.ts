import type { Connection } from "mongoose";
import type { FeatureFlagsService } from "../../feature-flags/feature-flags.service";
import type { User } from "../../user/entities/user.entity";
import { MongoOrbitIdentityWriter } from "./orbit-identity-writer.mongo";
import type { IdentityRegistryRepository } from "./repositories/identity-registry.repository";
import type { OrbitCompanyIdentityRepository } from "./repositories/orbit-company-identity.repository";
import type { OrbitRecruiterIdentityRepository } from "./repositories/orbit-recruiter-identity.repository";
import type { OrbitSeekerIdentityRepository } from "./repositories/orbit-seeker-identity.repository";
import type { OrbitStudentIdentityRepository } from "./repositories/orbit-student-identity.repository";

const DUAL_WRITE = "ORBIT_IDENTITY_DUAL_WRITE";

function build(enabled: boolean, opts?: { saveRejects?: boolean }) {
  const flags = {
    isEnabled: jest.fn(async (key: string) => key === DUAL_WRITE && enabled),
  } as unknown as FeatureFlagsService;

  const makeRepo = () => ({
    save: jest.fn(async (entity: { id: number }) => {
      if (opts?.saveRejects) throw new Error("mirror boom");
      return entity;
    }),
    remove: jest.fn(async (_entity: { id: number }) => undefined),
  });
  const company = makeRepo();
  const seeker = makeRepo();
  const recruiter = makeRepo();
  const student = makeRepo();

  const registry = {
    upsert: jest.fn(async () => undefined),
    deleteByUserId: jest.fn(async () => undefined),
  } as unknown as jest.Mocked<IdentityRegistryRepository>;

  const insertOne = jest.fn(async (_doc: unknown) => undefined);
  const collection = jest.fn(() => ({ insertOne }));
  const orbitConnection = { db: { collection } } as unknown as Connection;

  const writer = new MongoOrbitIdentityWriter(
    company as unknown as OrbitCompanyIdentityRepository,
    seeker as unknown as OrbitSeekerIdentityRepository,
    recruiter as unknown as OrbitRecruiterIdentityRepository,
    student as unknown as OrbitStudentIdentityRepository,
    registry,
    flags,
    orbitConnection,
  );

  return { writer, company, seeker, registry, collection, insertOne };
}

function userRow(id: number): User {
  return {
    id,
    email: "A@x.com",
    passwordHash: "h",
    emailVerified: false,
    status: "pending",
  } as unknown as User;
}

describe("MongoOrbitIdentityWriter", () => {
  it("is a no-op when ORBIT_IDENTITY_DUAL_WRITE is off", async () => {
    const ctx = build(false);
    await ctx.writer.createIdentity("company", userRow(5));
    expect(ctx.company.save).not.toHaveBeenCalled();
    expect(ctx.registry.upsert).not.toHaveBeenCalled();
  });

  it("createIdentity upserts with _id parity + normalized emailLower and registers", async () => {
    const ctx = build(true);
    await ctx.writer.createIdentity("company", userRow(5));

    expect(ctx.company.save).toHaveBeenCalledTimes(1);
    const saved = ctx.company.save.mock.calls[0][0] as { id: number; emailLower: string };
    expect(saved.id).toBe(5);
    expect(saved.emailLower).toBe("a@x.com");
    expect(ctx.registry.upsert).toHaveBeenCalledWith(5, "orbit", "company", "a@x.com");
  });

  it("is idempotent on replay — same _id, no duplicate identity", async () => {
    const ctx = build(true);
    await ctx.writer.createIdentity("company", userRow(5));
    await ctx.writer.createIdentity("company", userRow(5));
    expect(ctx.company.save).toHaveBeenCalledTimes(2);
    expect((ctx.company.save.mock.calls[0][0] as { id: number }).id).toBe(5);
    expect((ctx.company.save.mock.calls[1][0] as { id: number }).id).toBe(5);
  });

  it("does NOT throw on mirror failure and enqueues a reconcile job", async () => {
    const ctx = build(true, { saveRejects: true });

    await expect(ctx.writer.createIdentity("company", userRow(5))).resolves.toBeUndefined();

    expect(ctx.collection).toHaveBeenCalledWith("orbit_identity_reconcile_queue");
    expect(ctx.insertOne).toHaveBeenCalledTimes(1);
    const job = ctx.insertOne.mock.calls[0][0] as { userId: number; op: string; module: string };
    expect(job).toMatchObject({ userId: 5, op: "createIdentity", module: "company" });
  });

  it("deleteIdentity removes the identity row and clears the registry entry", async () => {
    const ctx = build(true);
    await ctx.writer.deleteIdentity(5, "company");
    expect(ctx.company.remove).toHaveBeenCalledWith({ id: 5 });
    expect(ctx.registry.deleteByUserId).toHaveBeenCalledWith(5);
  });
});
