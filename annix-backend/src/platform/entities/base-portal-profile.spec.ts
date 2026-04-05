import { getMetadataArgsStorage } from "typeorm";
import { CustomerProfile } from "../../customer/entities/customer-profile.entity";
import { SupplierProfile } from "../../supplier/entities/supplier-profile.entity";
import { BasePortalProfile } from "./base-portal-profile";

interface ExpectedColumn {
  propertyName: string;
  dbName: string;
  nullable?: boolean;
  length?: number;
  type?: string;
}

const EXPECTED_BASE_COLUMNS: ExpectedColumn[] = [
  { propertyName: "id", dbName: "id" },
  { propertyName: "userId", dbName: "user_id" },
  { propertyName: "jobTitle", dbName: "job_title", nullable: true, length: 100 },
  { propertyName: "directPhone", dbName: "direct_phone", nullable: true, length: 30 },
  { propertyName: "mobilePhone", dbName: "mobile_phone", nullable: true, length: 30 },
  { propertyName: "emailVerified", dbName: "email_verified" },
  {
    propertyName: "emailVerificationToken",
    dbName: "email_verification_token",
    nullable: true,
    type: "varchar",
    length: 500,
  },
  {
    propertyName: "emailVerificationExpires",
    dbName: "email_verification_expires",
    nullable: true,
    type: "timestamp",
  },
  { propertyName: "suspensionReason", dbName: "suspension_reason", nullable: true, type: "text" },
  { propertyName: "suspendedAt", dbName: "suspended_at", nullable: true, type: "timestamp" },
  { propertyName: "suspendedBy", dbName: "suspended_by", nullable: true, type: "int" },
  {
    propertyName: "documentStorageAcceptedAt",
    dbName: "document_storage_accepted_at",
    nullable: true,
    type: "timestamp",
  },
  { propertyName: "createdAt", dbName: "created_at" },
  { propertyName: "updatedAt", dbName: "updated_at" },
];

describe("BasePortalProfile", () => {
  const storage = getMetadataArgsStorage();
  const baseColumns = storage.columns.filter((c) => c.target === BasePortalProfile);

  it("declares all 14 shared columns on the abstract base class", () => {
    const propertyNames = baseColumns.map((c) => c.propertyName).sort();
    const expected = EXPECTED_BASE_COLUMNS.map((c) => c.propertyName).sort();
    expect(propertyNames).toEqual(expected);
  });

  it.each(
    EXPECTED_BASE_COLUMNS,
  )("base column $propertyName maps to db column $dbName with expected options", (expected) => {
    const column = baseColumns.find((c) => c.propertyName === expected.propertyName);
    expect(column).toBeDefined();
    const options = column?.options ?? {};
    const actualName = options.name ?? column?.propertyName;
    expect(actualName).toBe(expected.dbName);
    if (expected.nullable !== undefined) {
      expect(options.nullable).toBe(expected.nullable);
    }
    if (expected.length !== undefined) {
      expect(options.length).toBe(expected.length);
    }
    if (expected.type !== undefined) {
      expect(options.type).toBe(expected.type);
    }
  });

  it("registers id as a PrimaryGeneratedColumn", () => {
    const pgc = storage.generations.find(
      (g) => g.target === BasePortalProfile && g.propertyName === "id",
    );
    expect(pgc).toBeDefined();
  });

  it("registers user as a OneToOne relation joined on user_id", () => {
    const relation = storage.relations.find(
      (r) => r.target === BasePortalProfile && r.propertyName === "user",
    );
    expect(relation).toBeDefined();
    expect(relation?.relationType).toBe("one-to-one");
    const joinColumn = storage.joinColumns.find(
      (j) => j.target === BasePortalProfile && j.propertyName === "user",
    );
    expect(joinColumn?.name).toBe("user_id");
  });

  describe("inheritance", () => {
    it("CustomerProfile extends BasePortalProfile", () => {
      expect(CustomerProfile.prototype).toBeInstanceOf(BasePortalProfile);
    });

    it("SupplierProfile extends BasePortalProfile", () => {
      expect(SupplierProfile.prototype).toBeInstanceOf(BasePortalProfile);
    });

    it("CustomerProfile instance has inherited column properties accessible", () => {
      const profile = new CustomerProfile();
      profile.id = 1;
      profile.userId = 42;
      profile.jobTitle = "Buyer";
      profile.emailVerified = true;
      profile.firstName = "Ada";
      expect(profile.id).toBe(1);
      expect(profile.userId).toBe(42);
      expect(profile.jobTitle).toBe("Buyer");
      expect(profile.emailVerified).toBe(true);
      expect(profile.firstName).toBe("Ada");
    });

    it("SupplierProfile instance has inherited column properties accessible", () => {
      const profile = new SupplierProfile();
      profile.id = 7;
      profile.userId = 99;
      profile.suspensionReason = "under review";
      profile.emailVerificationToken = "tok123";
      expect(profile.id).toBe(7);
      expect(profile.userId).toBe(99);
      expect(profile.suspensionReason).toBe("under review");
      expect(profile.emailVerificationToken).toBe("tok123");
    });
  });
});
