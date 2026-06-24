import type { mongo } from "mongoose";

type LegacyProspect = {
  _id: number;
  address?: unknown;
  streetAddress?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
};

export const up = async (db: mongo.Db): Promise<void> => {
  const prospects = (await db
    .collection("annix_rep_prospects")
    .find({})
    .toArray()) as unknown as LegacyProspect[];

  await prospects.reduce(async (prev, prospect) => {
    await prev;

    if (prospect.address != null) {
      return;
    }

    const hasFlatFields =
      prospect.streetAddress != null ||
      prospect.city != null ||
      prospect.province != null ||
      prospect.postalCode != null;

    if (!hasFlatFields) {
      return;
    }

    const address = {
      streetAddress: prospect.streetAddress ?? null,
      city: prospect.city ?? null,
      province: prospect.province ?? null,
      postalCode: prospect.postalCode ?? null,
    };

    await db.collection("annix_rep_prospects").updateOne(
      { _id: prospect._id as unknown as mongo.ObjectId },
      {
        $set: { address },
        $unset: {
          streetAddress: "",
          city: "",
          province: "",
          postalCode: "",
        },
      },
    );
  }, Promise.resolve());
};

export const down = async (db: mongo.Db): Promise<void> => {
  const prospects = (await db
    .collection("annix_rep_prospects")
    .find({})
    .toArray()) as unknown as LegacyProspect[];

  await prospects.reduce(async (prev, prospect) => {
    await prev;

    if (prospect.address == null) {
      return;
    }

    const address = prospect.address as {
      streetAddress?: string | null;
      city?: string | null;
      province?: string | null;
      postalCode?: string | null;
    };

    await db.collection("annix_rep_prospects").updateOne(
      { _id: prospect._id as unknown as mongo.ObjectId },
      {
        $set: {
          streetAddress: address.streetAddress ?? null,
          city: address.city ?? null,
          province: address.province ?? null,
          postalCode: address.postalCode ?? null,
        },
        $unset: { address: "" },
      },
    );
  }, Promise.resolve());
};
