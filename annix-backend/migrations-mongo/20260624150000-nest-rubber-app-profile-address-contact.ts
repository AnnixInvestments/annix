import type { mongo } from "mongoose";

type LegacyProfile = {
  _id: number;
  address?: unknown;
  contact?: unknown;
  streetAddress?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
};

export const up = async (db: mongo.Db): Promise<void> => {
  const profiles = (await db
    .collection("rubber_app_profile")
    .find({})
    .toArray()) as unknown as LegacyProfile[];

  await profiles.reduce(async (prev, profile) => {
    await prev;

    if (profile.address != null || profile.contact != null) {
      return;
    }

    const hasFlatFields =
      profile.streetAddress != null ||
      profile.city != null ||
      profile.province != null ||
      profile.postalCode != null ||
      profile.phone != null ||
      profile.email != null;

    if (!hasFlatFields) {
      return;
    }

    const address = {
      streetAddress: profile.streetAddress ?? null,
      city: profile.city ?? null,
      province: profile.province ?? null,
      postalCode: profile.postalCode ?? null,
    };

    const contact = {
      phone: profile.phone ?? null,
      email: profile.email ?? null,
    };

    await db.collection("rubber_app_profile").updateOne(
      { _id: profile._id as unknown as mongo.ObjectId },
      {
        $set: { address, contact },
        $unset: {
          streetAddress: "",
          city: "",
          province: "",
          postalCode: "",
          phone: "",
          email: "",
        },
      },
    );
  }, Promise.resolve());
};

export const down = async (db: mongo.Db): Promise<void> => {
  const profiles = (await db
    .collection("rubber_app_profile")
    .find({})
    .toArray()) as unknown as LegacyProfile[];

  await profiles.reduce(async (prev, profile) => {
    await prev;

    if (profile.address == null && profile.contact == null) {
      return;
    }

    const address = (profile.address ?? {}) as {
      streetAddress?: string | null;
      city?: string | null;
      province?: string | null;
      postalCode?: string | null;
    };
    const contact = (profile.contact ?? {}) as {
      phone?: string | null;
      email?: string | null;
    };

    await db.collection("rubber_app_profile").updateOne(
      { _id: profile._id as unknown as mongo.ObjectId },
      {
        $set: {
          streetAddress: address.streetAddress ?? null,
          city: address.city ?? null,
          province: address.province ?? null,
          postalCode: address.postalCode ?? null,
          phone: contact.phone ?? null,
          email: contact.email ?? null,
        },
        $unset: { address: "", contact: "" },
      },
    );
  }, Promise.resolve());
};
