import type { Connection } from "mongoose";
import type { FeatureFlagsService } from "../../feature-flags/feature-flags.service";
import type { User } from "../../user/entities/user.entity";
import type { UserRepository } from "../../user/user.repository";
import { OrbitIdentityReconciler } from "./orbit-identity-reconciler.service";
import type { OrbitIdentityWriter } from "./orbit-identity-writer";

type QueueItem = { _id: string; userId: number; module: string; op: string };

function build(opts: {
  dualWrite: boolean;
  items: QueueItem[];
  user?: User | null;
  remaining?: number;
}) {
  const flags = {
    isEnabled: jest.fn(async () => opts.dualWrite),
  } as unknown as FeatureFlagsService;

  const userRepo = {
    findById: jest.fn(async (_id: number) => opts.user ?? null),
  } as unknown as jest.Mocked<UserRepository>;

  const writer = {
    createIdentity: jest.fn(async () => undefined),
    deleteIdentity: jest.fn(async () => undefined),
  } as unknown as jest.Mocked<OrbitIdentityWriter>;

  const toArray = jest.fn(async () => opts.items);
  const limit = jest.fn(() => ({ toArray }));
  const find = jest.fn(() => ({ limit }));
  const deleteOne = jest.fn(async () => undefined);
  const countDocuments = jest.fn(async () => opts.remaining ?? 0);
  const queue = { find, deleteOne, countDocuments };
  const collection = jest.fn(() => queue);
  const orbitConnection = { db: { collection } } as unknown as Connection;

  const reconciler = new OrbitIdentityReconciler(userRepo, writer, flags, orbitConnection);
  return { reconciler, writer, userRepo, deleteOne, find };
}

function userRow(id: number): User {
  return { id, email: "a@x.com", appScope: "orbit:company", passwordHash: "h" } as unknown as User;
}

describe("OrbitIdentityReconciler", () => {
  it("does nothing while dual-write is off", async () => {
    const ctx = build({
      dualWrite: false,
      items: [{ _id: "q1", userId: 5, module: "company", op: "applyVerification" }],
    });
    await ctx.reconciler.drain();
    expect(ctx.find).not.toHaveBeenCalled();
    expect(ctx.writer.createIdentity).not.toHaveBeenCalled();
  });

  it("rebuilds a COMPLETE identity + registry from `user` for a non-delete op, then removes the queue item", async () => {
    const ctx = build({
      dualWrite: true,
      items: [{ _id: "q1", userId: 5, module: "company", op: "applyVerification" }],
      user: userRow(5),
    });

    await ctx.reconciler.drain();

    expect(ctx.userRepo.findById).toHaveBeenCalledWith(5);
    expect(ctx.writer.createIdentity).toHaveBeenCalledTimes(1);
    expect(ctx.writer.createIdentity.mock.calls[0][0]).toBe("company");
    expect(ctx.deleteOne).toHaveBeenCalledWith({ _id: "q1" });
  });

  it("converges a deleteIdentity op via the writer's idempotent delete", async () => {
    const ctx = build({
      dualWrite: true,
      items: [{ _id: "q2", userId: 9, module: "seeker", op: "deleteIdentity" }],
    });

    await ctx.reconciler.drain();

    expect(ctx.writer.deleteIdentity).toHaveBeenCalledWith(9, "seeker");
    expect(ctx.writer.createIdentity).not.toHaveBeenCalled();
    expect(ctx.deleteOne).toHaveBeenCalledWith({ _id: "q2" });
  });

  it("drops a non-delete op whose source user is gone (cannot rebuild) without recreating", async () => {
    const ctx = build({
      dualWrite: true,
      items: [{ _id: "q3", userId: 7, module: "company", op: "setStatus" }],
      user: null,
    });

    await ctx.reconciler.drain();

    expect(ctx.writer.createIdentity).not.toHaveBeenCalled();
    expect(ctx.deleteOne).toHaveBeenCalledWith({ _id: "q3" });
  });
});
