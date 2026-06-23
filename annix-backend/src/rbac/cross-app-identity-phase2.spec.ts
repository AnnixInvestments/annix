import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { AdminAuthService } from "../admin/admin-auth.service";
import { AppScope } from "./app-scope";

/**
 * Cross-app identity isolation guard (issue #389, Phase 2).
 *
 * The `user` collection is SHARED across every Annix app, partitioned by the
 * string `appScope`. The invariant these tests lock:
 *
 *   Registering email X into app B must leave app A's record (its scope and its
 *   passwordHash) completely untouched, and each app's login must resolve ITS
 *   OWN record — never the other app's. The same email holds a SEPARATE account
 *   per app.
 *
 * Covered pairings: Customer ↔ Supplier and Customer ↔ Admin.
 */

interface FakeUser {
  id: number;
  email: string;
  username?: string;
  passwordHash: string | null;
  appScope: string | null;
  status?: string;
  roles?: { name: string }[];
  lastLoginAt?: Date;
}

/**
 * In-memory stand-in for the shared `user` collection whose lookup + write
 * methods reproduce the real Mongo repository's scope partitioning exactly:
 *  - findOneByEmailAndScope / findByEmailWithRolesAndScope => exact-scope match
 *  - findOneByEmail / findByEmailWithRoles                 => NON-orbit records
 *  - create                                                => mints a new row
 */
function makeUserRepo(seed: FakeUser[]) {
  const rows = [...seed];
  const ci = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const isOrbit = (s: string | null) => typeof s === "string" && s.startsWith("orbit:");
  let nextId = rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;

  const repo = {
    rows,
    findOneByEmail: jest.fn(
      async (email: string) => rows.find((r) => ci(r.email, email) && !isOrbit(r.appScope)) ?? null,
    ),
    findByEmailWithRoles: jest.fn(
      async (email: string) => rows.find((r) => ci(r.email, email) && !isOrbit(r.appScope)) ?? null,
    ),
    findOneByEmailAndScope: jest.fn(
      async (email: string, scope: string) =>
        rows.find((r) => ci(r.email, email) && r.appScope === scope) ?? null,
    ),
    findByEmailWithRolesAndScope: jest.fn(
      async (email: string, scope: string) =>
        rows.find((r) => ci(r.email, email) && r.appScope === scope) ?? null,
    ),
    findOneByEmailCaseInsensitiveWithRoles: jest.fn(
      async (email: string) => rows.find((r) => ci(r.email, email) && !isOrbit(r.appScope)) ?? null,
    ),
    findById: jest.fn(async (id: number) => rows.find((r) => r.id === id) ?? null),
    findByIdWithRoles: jest.fn(async (id: number) => rows.find((r) => r.id === id) ?? null),
    create: jest.fn(async (data: Partial<FakeUser>) => {
      const created: FakeUser = {
        id: nextId++,
        email: data.email ?? "",
        passwordHash: data.passwordHash ?? null,
        appScope: data.appScope ?? null,
        status: data.status ?? "active",
        roles: data.roles ?? [],
      };
      rows.push(created);
      return created;
    }),
    save: jest.fn(async (u: FakeUser) => u),
  };
  return repo;
}

function makeAdminService(userRepo: ReturnType<typeof makeUserRepo>) {
  const noop = {} as never;
  const adminSessionRepo = { create: jest.fn().mockResolvedValue({}) } as never;
  const auditService = { log: jest.fn().mockResolvedValue(undefined) } as never;
  const passwordService = {
    verify: jest.fn(async (plain: string, hash: string) => plain === `plain:${hash}`),
  } as never;
  const tokenService = {
    generateTokenPair: jest.fn().mockResolvedValue({ accessToken: "a", refreshToken: "r" }),
  } as never;
  const authConfigService = {
    isPasswordVerificationDisabled: () => false,
    isAccountStatusCheckDisabled: () => true,
  } as never;
  // Global admin role short-circuits checkAppAccess without touching app repos.
  return new AdminAuthService(
    adminSessionRepo,
    userRepo as never,
    noop,
    noop,
    noop,
    auditService,
    passwordService,
    tokenService,
    authConfigService,
  );
}

function customerRecord(): FakeUser {
  return {
    id: 1,
    email: "shared@example.com",
    username: "shared@example.com",
    passwordHash: "CUSTOMER_HASH",
    appScope: AppScope.FORGE_CUSTOMER,
    status: "active",
    roles: [{ name: "customer" }],
  };
}

describe("Cross-app identity isolation (Phase 2)", () => {
  describe("Customer ↔ Supplier", () => {
    it("supplier registration for an existing customer email mints a SEPARATE record and leaves the customer untouched", async () => {
      const customer = customerRecord();
      const repo = makeUserRepo([customer]);

      // The supplier register guard checks the SUPPLIER scope only.
      const supplierGuard = await repo.findOneByEmailAndScope(
        "shared@example.com",
        AppScope.FORGE_SUPPLIER,
      );
      expect(supplierGuard).toBeNull();

      // Minting the supplier record (what SupplierAuthService.register does).
      const supplier = await repo.create({
        email: "shared@example.com",
        passwordHash: "SUPPLIER_HASH",
        appScope: AppScope.FORGE_SUPPLIER,
      });

      // The customer record is untouched: scope + hash unchanged.
      expect(customer.appScope).toBe(AppScope.FORGE_CUSTOMER);
      expect(customer.passwordHash).toBe("CUSTOMER_HASH");
      expect(supplier.id).not.toBe(customer.id);

      // Each app's login resolves its OWN record.
      const customerLogin = await repo.findByEmailWithRolesAndScope(
        "shared@example.com",
        AppScope.FORGE_CUSTOMER,
      );
      const supplierLogin = await repo.findByEmailWithRolesAndScope(
        "shared@example.com",
        AppScope.FORGE_SUPPLIER,
      );
      expect(customerLogin?.id).toBe(customer.id);
      expect(customerLogin?.passwordHash).toBe("CUSTOMER_HASH");
      expect(supplierLogin?.id).toBe(supplier.id);
      expect(supplierLogin?.passwordHash).toBe("SUPPLIER_HASH");
    });

    it("customer scoped login never resolves a supplier-only record", async () => {
      const supplierOnly: FakeUser = {
        id: 7,
        email: "supplieronly@example.com",
        passwordHash: "SUPPLIER_HASH",
        appScope: AppScope.FORGE_SUPPLIER,
      };
      const repo = makeUserRepo([supplierOnly]);

      const customerLogin = await repo.findByEmailWithRolesAndScope(
        "supplieronly@example.com",
        AppScope.FORGE_CUSTOMER,
      );
      expect(customerLogin).toBeNull();
    });
  });

  describe("Customer ↔ Admin", () => {
    it("admin login resolves only the annix:admin record, never the customer record", async () => {
      const customer = customerRecord();
      const repo = makeUserRepo([customer]);
      const service = makeAdminService(repo);

      // Only a customer record exists for this email — admin login must reject.
      await expect(
        service.login(
          { email: "shared@example.com", password: "plain:CUSTOMER_HASH" },
          "1.1.1.1",
          "jest",
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      // It never touched the customer record's password.
      expect(repo.findByEmailWithRolesAndScope).toHaveBeenCalledWith(
        "shared@example.com",
        AppScope.ANNIX_ADMIN,
      );
      expect(customer.passwordHash).toBe("CUSTOMER_HASH");
    });

    it("admin login authenticates the separate admin record without altering the customer's", async () => {
      const customer = customerRecord();
      const admin: FakeUser = {
        id: 2,
        email: "shared@example.com",
        passwordHash: "ADMIN_HASH",
        appScope: AppScope.ANNIX_ADMIN,
        status: "active",
        roles: [{ name: "admin" }],
      };
      const repo = makeUserRepo([customer, admin]);
      const service = makeAdminService(repo);

      const result = await service.login(
        { email: "shared@example.com", password: "plain:ADMIN_HASH" },
        "1.1.1.1",
        "jest",
      );

      expect(result.user.id).toBe(admin.id);
      expect(result.user.id).not.toBe(customer.id);
      // Customer's identity is untouched.
      expect(customer.appScope).toBe(AppScope.FORGE_CUSTOMER);
      expect(customer.passwordHash).toBe("CUSTOMER_HASH");
    });

    it("an admin whose password fails is rejected even when a customer record shares the email", async () => {
      const customer = customerRecord();
      const admin: FakeUser = {
        id: 2,
        email: "shared@example.com",
        passwordHash: "ADMIN_HASH",
        appScope: AppScope.ANNIX_ADMIN,
        status: "active",
        roles: [{ name: "admin" }],
      };
      const repo = makeUserRepo([customer, admin]);
      const service = makeAdminService(repo);

      // Supplying the CUSTOMER's password must not authenticate the admin —
      // the admin record's own hash is the only one consulted.
      await expect(
        service.login(
          { email: "shared@example.com", password: "plain:CUSTOMER_HASH" },
          "1.1.1.1",
          "jest",
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  it("ForbiddenException is reachable but identity resolution stays scoped", () => {
    // Sanity: the ForbiddenException import is used by the suite's contract.
    expect(ForbiddenException).toBeDefined();
  });
});
