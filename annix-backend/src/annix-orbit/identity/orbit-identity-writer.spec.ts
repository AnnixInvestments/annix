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

function build(enabled: boolean, opts?: { saveRejects?: boolean; matchedCount?: number }) {
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

  // Native collection surface used by F2 update-only + the reconcile enqueue.
  const updateOne = jest.fn(async (_filter: unknown, _update: unknown, _options: unknown) => ({
    matchedCount: opts?.matchedCount ?? 1,
  }));
  const insertOne = jest.fn(async (_doc: unknown) => undefined);
  const collection = jest.fn(() => ({ updateOne, insertOne }));
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

  return { writer, company, seeker, registry, collection, updateOne, insertOne };
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
    await ctx.writer.applyVerification(5, "company");
    expect(ctx.company.save).not.toHaveBeenCalled();
    expect(ctx.updateOne).not.toHaveBeenCalled();
    expect(ctx.registry.upsert).not.toHaveBeenCalled();
  });

  it("createIdentity upserts a COMPLETE row with _id parity + normalized emailLower and registers", async () => {
    const ctx = build(true);
    await ctx.writer.createIdentity("company", userRow(5));

    expect(ctx.company.save).toHaveBeenCalledTimes(1);
    const saved = ctx.company.save.mock.calls[0][0] as {
      id: number;
      emailLower: string;
      module: string;
      passwordHash: string;
    };
    expect(saved.id).toBe(5);
    expect(saved.emailLower).toBe("a@x.com");
    expect(saved.module).toBe("company");
    expect(saved.passwordHash).toBe("h");
    expect(ctx.registry.upsert).toHaveBeenCalledWith(5, "orbit", "company", "a@x.com");
  });

  it("F1 — recordLogin self-heals a COMPLETE identity row + registry on an absent row", async () => {
    const ctx = build(true);
    await ctx.writer.recordLogin("company", userRow(5));

    expect(ctx.company.save).toHaveBeenCalledTimes(1);
    const saved = ctx.company.save.mock.calls[0][0] as {
      id: number;
      emailLower: string;
      module: string;
      passwordHash: string;
    };
    expect(saved).toMatchObject({
      id: 5,
      emailLower: "a@x.com",
      module: "company",
      passwordHash: "h",
    });
    expect(ctx.registry.upsert).toHaveBeenCalledWith(5, "orbit", "company", "a@x.com");
  });

  it("F2 — a mutation mirror on an ABSENT row does NOT insert and enqueues a reconcile", async () => {
    const ctx = build(true, { matchedCount: 0 });
    await ctx.writer.applyVerification(5, "company");

    expect(ctx.updateOne).toHaveBeenCalledTimes(1);
    expect(ctx.updateOne.mock.calls[0][2]).toMatchObject({ upsert: false });
    // Never produces a partial row via the complete-row save path.
    expect(ctx.company.save).not.toHaveBeenCalled();
    expect(ctx.insertOne).toHaveBeenCalledTimes(1);
    const job = ctx.insertOne.mock.calls[0][0] as { op: string; userId: number };
    expect(job).toMatchObject({ op: "applyVerification", userId: 5 });
  });

  it("F2 — a mutation mirror on a PRESENT row updates and does not enqueue", async () => {
    const ctx = build(true, { matchedCount: 1 });
    await ctx.writer.setStatus(5, "company", "deactivated");

    expect(ctx.updateOne).toHaveBeenCalledTimes(1);
    expect(ctx.company.save).not.toHaveBeenCalled();
    expect(ctx.insertOne).not.toHaveBeenCalled();
  });

  it("no mutation-mirror path can ever insert a partial row (only update-or-enqueue)", async () => {
    const ctx = build(true, { matchedCount: 0 });
    await ctx.writer.applyVerification(5, "company");
    await ctx.writer.setVerificationToken(5, "company", "t", null);
    await ctx.writer.setResetToken(5, "company", "t", null);
    await ctx.writer.applyPasswordReset(5, "company", "newhash");
    await ctx.writer.setStatus(5, "company", "active");
    await ctx.writer.applyProfileChanges(5, "company", { firstName: "Jo" });

    // All six attempted an update-only ($set, upsert:false) and enqueued on miss.
    expect(ctx.updateOne).toHaveBeenCalledTimes(6);
    expect(ctx.insertOne).toHaveBeenCalledTimes(6);
    expect(ctx.company.save).not.toHaveBeenCalled();
  });

  it("does NOT throw on a complete-write mirror failure and enqueues a reconcile", async () => {
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
