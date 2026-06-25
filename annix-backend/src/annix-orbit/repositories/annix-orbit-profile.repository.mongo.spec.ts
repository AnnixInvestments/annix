import { keys } from "es-toolkit/compat";
import type { Model } from "mongoose";
import type { AnnixOrbitProfile } from "../entities/annix-orbit-profile.entity";
import { MongoAnnixOrbitProfileRepository } from "./annix-orbit-profile.repository.mongo";

function makeRepo() {
  const captured: { update: Record<string, unknown> | null } = { update: null };

  const lean = () => ({ exec: () => Promise.resolve(captured.update) });
  const findByIdAndUpdate = jest.fn((_id: unknown, update: Record<string, unknown>) => {
    captured.update = update;
    return { lean };
  });

  const schema = {
    virtuals: {},
    paths: {},
    path: (name: string) => (name === "_id" ? { instance: "Number" } : undefined),
  };

  const model = {
    schema,
    findByIdAndUpdate,
  } as unknown as Model<AnnixOrbitProfile>;

  const userModel = {} as unknown as Model<{ _id: number }>;
  const companyModel = {} as unknown as Model<{ _id: number }>;

  const repo = new MongoAnnixOrbitProfileRepository(model, userModel, companyModel);
  return { repo, captured, findByIdAndUpdate };
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
