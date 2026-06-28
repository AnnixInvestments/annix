import { keys } from "es-toolkit/compat";
import type { Model } from "mongoose";
import type { AnnixOrbitProfile } from "../entities/annix-orbit-profile.entity";
import { MongoAnnixOrbitProfileRepository } from "./annix-orbit-profile.repository.mongo";

function makeRepo() {
  const captured: {
    update: Record<string, unknown> | null;
    updateManyFilter: Record<string, unknown> | null;
    updateManyUpdate: Record<string, unknown> | null;
  } = { update: null, updateManyFilter: null, updateManyUpdate: null };

  const lean = () => ({ exec: () => Promise.resolve(captured.update) });
  const findByIdAndUpdate = jest.fn((_id: unknown, update: Record<string, unknown>) => {
    captured.update = update;
    return { lean };
  });
  const updateMany = jest.fn((filter: Record<string, unknown>, update: Record<string, unknown>) => {
    captured.updateManyFilter = filter;
    captured.updateManyUpdate = update;
    return { exec: () => Promise.resolve(undefined) };
  });

  const schema = {
    virtuals: {},
    paths: {},
    path: (name: string) => (name === "_id" ? { instance: "Number" } : undefined),
  };

  const model = {
    schema,
    findByIdAndUpdate,
    updateMany,
  } as unknown as Model<AnnixOrbitProfile>;

  const userModel = {} as unknown as Model<{ _id: number }>;
  const companyModel = {} as unknown as Model<{ _id: number }>;

  const repo = new MongoAnnixOrbitProfileRepository(model, userModel, companyModel);
  return { repo, captured, findByIdAndUpdate, updateMany };
}

describe("MongoAnnixOrbitProfileRepository.save", () => {
  it("never writes billing-managed fields on a full-profile save (lost-update guard)", async () => {
    const { repo, captured } = makeRepo();

    const profile = {
      id: 7,
      userId: 42,
      phone: "+27 11 000 1234",
      entitledTier: "soft",
      billingStatus: "none",
      paidUntil: null,
      subscription: null,
    } as unknown as AnnixOrbitProfile;

    await repo.save(profile);

    const update = captured.update ?? {};
    expect(update).not.toHaveProperty("entitledTier");
    expect(update).not.toHaveProperty("billingStatus");
    expect(update).not.toHaveProperty("paidUntil");
    expect(update).not.toHaveProperty("subscription");
    expect(update).toHaveProperty("phone", "+27 11 000 1234");
  });

  it("does not clobber an active grant when a stale profile is saved back", async () => {
    const { repo, captured } = makeRepo();

    const staleProfile = {
      id: 7,
      userId: 42,
      phone: "+27 11 000 9999",
      entitledTier: "soft",
      billingStatus: "none",
      paidUntil: null,
      subscription: null,
    } as unknown as AnnixOrbitProfile;

    await repo.save(staleProfile);

    const update = captured.update ?? {};
    const updateKeys = keys(update);
    expect(updateKeys).not.toContain("billingStatus");
    expect(updateKeys).not.toContain("paidUntil");
    expect(updateKeys).not.toContain("subscription");
  });
});

describe("MongoAnnixOrbitProfileRepository.setNotificationPreferences", () => {
  it("updates only the provided pref keys, scoped to the userId", async () => {
    const { repo, captured, updateMany } = makeRepo();

    await repo.setNotificationPreferences(42, { matchAlertThreshold: 65, digestEnabled: false });

    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(captured.updateManyFilter).toEqual({ userId: 42 });
    expect(captured.updateManyUpdate).toEqual({ matchAlertThreshold: 65, digestEnabled: false });
  });

  it("ignores undefined keys (partial update)", async () => {
    const { repo, captured } = makeRepo();

    await repo.setNotificationPreferences(42, { pushEnabled: true });

    expect(captured.updateManyUpdate).toEqual({ pushEnabled: true });
  });

  it("is a no-op when no preference fields are supplied", async () => {
    const { repo, updateMany } = makeRepo();

    await repo.setNotificationPreferences(42, {});

    expect(updateMany).not.toHaveBeenCalled();
  });
});
