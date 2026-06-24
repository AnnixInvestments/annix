import type { mongo } from "mongoose";

type LegacyCompany = {
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
  const companies = (await db
    .collection("stock_control_companies")
    .find({})
    .toArray()) as unknown as LegacyCompany[];

  await companies.reduce(async (prev, company) => {
    await prev;

    if (company.address != null || company.contact != null) {
      return;
    }

    const hasFlatFields =
      company.streetAddress != null ||
      company.city != null ||
      company.province != null ||
      company.postalCode != null ||
      company.phone != null ||
      company.email != null;

    if (!hasFlatFields) {
      return;
    }

    const address = {
      streetAddress: company.streetAddress ?? null,
      city: company.city ?? null,
      province: company.province ?? null,
      postalCode: company.postalCode ?? null,
    };

    const contact = {
      phone: company.phone ?? null,
      email: company.email ?? null,
    };

    await db.collection("stock_control_companies").updateOne(
      { _id: company._id as unknown as mongo.ObjectId },
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
  const companies = (await db
    .collection("stock_control_companies")
    .find({})
    .toArray()) as unknown as LegacyCompany[];

  await companies.reduce(async (prev, company) => {
    await prev;

    if (company.address == null && company.contact == null) {
      return;
    }

    const address = (company.address ?? {}) as {
      streetAddress?: string | null;
      city?: string | null;
      province?: string | null;
      postalCode?: string | null;
    };
    const contact = (company.contact ?? {}) as {
      phone?: string | null;
      email?: string | null;
    };

    await db.collection("stock_control_companies").updateOne(
      { _id: company._id as unknown as mongo.ObjectId },
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
