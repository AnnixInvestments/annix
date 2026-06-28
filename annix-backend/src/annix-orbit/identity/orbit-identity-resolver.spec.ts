import type { FeatureFlagsService } from "../../feature-flags/feature-flags.service";
import type { User } from "../../user/entities/user.entity";
import type { UserRepository } from "../../user/user.repository";
import { OrbitIdentityResolver } from "./orbit-identity-resolver";
import type { IdentityRegistryRepository } from "./repositories/identity-registry.repository";
import type { OrbitCompanyIdentityRepository } from "./repositories/orbit-company-identity.repository";
import type { OrbitRecruiterIdentityRepository } from "./repositories/orbit-recruiter-identity.repository";
import type { OrbitSeekerIdentityRepository } from "./repositories/orbit-seeker-identity.repository";
import type { OrbitStudentIdentityRepository } from "./repositories/orbit-student-identity.repository";

const READ = "ORBIT_IDENTITY_READ";
const DUAL_WRITE = "ORBIT_IDENTITY_DUAL_WRITE";

function userRow(id: number, scope: string): User {
  return { id, email: "u@x.com", appScope: scope, passwordHash: `h${id}` } as unknown as User;
}

function build(flagState: Record<string, boolean>) {
  const flags = {
    isEnabled: jest.fn(async (key: string) => flagState[key] ?? false),
  } as unknown as FeatureFlagsService;

  const userRepo = {
    findOneByEmailAndScope: jest.fn(async (_email: string, _scope: string) => null),
    findOrbitUserByEmail: jest.fn(async (_email: string) => null),
    findById: jest.fn(async (_id: number) => null),
  } as unknown as jest.Mocked<UserRepository>;

  const registry = {
    findByEmailLower: jest.fn(async (_el: string) => [] as Array<{ module: string }>),
  } as unknown as jest.Mocked<IdentityRegistryRepository>;

  const makeRepo = () => ({ findByEmailLower: jest.fn(async (_el: string) => null) });
  const company = makeRepo();
  const seeker = makeRepo();
  const recruiter = makeRepo();
  const student = makeRepo();

  const resolver = new OrbitIdentityResolver(
    userRepo,
    registry,
    flags,
    company as unknown as OrbitCompanyIdentityRepository,
    seeker as unknown as OrbitSeekerIdentityRepository,
    recruiter as unknown as OrbitRecruiterIdentityRepository,
    student as unknown as OrbitStudentIdentityRepository,
  );

  return { resolver, userRepo, registry, company, seeker, recruiter, student };
}

describe("OrbitIdentityResolver", () => {
  it("READ off, module specified → today's scoped lookup, never touches the new stores", async () => {
    const ctx = build({});
    ctx.userRepo.findOneByEmailAndScope.mockResolvedValue(userRow(1, "orbit:company"));

    const candidates = await ctx.resolver.resolveLoginCandidates("u@x.com", "company");

    expect(candidates).toHaveLength(1);
    expect(candidates[0].module).toBe("company");
    expect(ctx.userRepo.findOneByEmailAndScope).toHaveBeenCalledWith("u@x.com", "orbit:company");
    expect(ctx.company.findByEmailLower).not.toHaveBeenCalled();
  });

  it("READ off, no module → single-row findOrbitUserByEmail (no disambiguation)", async () => {
    const ctx = build({});
    ctx.userRepo.findOrbitUserByEmail.mockResolvedValue(userRow(2, "orbit:seeker"));

    const candidates = await ctx.resolver.resolveLoginCandidates("u@x.com", null);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].module).toBe("seeker");
    expect(ctx.userRepo.findOrbitUserByEmail).toHaveBeenCalled();
  });

  it("READ on while DUAL_WRITE off → CRITICAL guard forces the legacy read path", async () => {
    const ctx = build({ [READ]: true, [DUAL_WRITE]: false });
    ctx.userRepo.findOneByEmailAndScope.mockResolvedValue(userRow(1, "orbit:company"));

    const candidates = await ctx.resolver.resolveLoginCandidates("u@x.com", "company");

    expect(candidates).toHaveLength(1);
    expect(ctx.userRepo.findOneByEmailAndScope).toHaveBeenCalled();
    expect(ctx.company.findByEmailLower).not.toHaveBeenCalled();
  });

  it("READ on, module specified → ONLY that module's store, never another module's row", async () => {
    const ctx = build({ [READ]: true, [DUAL_WRITE]: true });
    ctx.company.findByEmailLower.mockResolvedValue({ id: 1 } as never);
    ctx.seeker.findByEmailLower.mockResolvedValue({ id: 2 } as never);
    ctx.userRepo.findById.mockResolvedValue(userRow(1, "orbit:company"));

    const candidates = await ctx.resolver.resolveLoginCandidates("u@x.com", "company");

    expect(candidates).toHaveLength(1);
    expect(candidates[0].user.id).toBe(1);
    expect(ctx.company.findByEmailLower).toHaveBeenCalledWith("u@x.com");
    expect(ctx.seeker.findByEmailLower).not.toHaveBeenCalled();
  });

  it("READ on, no module → registry fan-out yields one candidate per module", async () => {
    const ctx = build({ [READ]: true, [DUAL_WRITE]: true });
    ctx.registry.findByEmailLower.mockResolvedValue([
      { module: "company" },
      { module: "seeker" },
    ] as never);
    ctx.company.findByEmailLower.mockResolvedValue({ id: 1 } as never);
    ctx.seeker.findByEmailLower.mockResolvedValue({ id: 2 } as never);
    ctx.userRepo.findById.mockImplementation(async (id: number) =>
      userRow(id, id === 1 ? "orbit:company" : "orbit:seeker"),
    );

    const candidates = await ctx.resolver.resolveLoginCandidates("u@x.com", null);

    expect(candidates.map((c) => c.module).sort()).toEqual(["company", "seeker"]);
  });

  it("returns no candidates when nothing matches", async () => {
    const ctx = build({});
    const candidates = await ctx.resolver.resolveLoginCandidates("u@x.com", "company");
    expect(candidates).toHaveLength(0);
  });

  it("READ on, module specified but no row → [] and NEVER queries user by scope (M4: no fallback)", async () => {
    const ctx = build({ [READ]: true, [DUAL_WRITE]: true });
    ctx.company.findByEmailLower.mockResolvedValue(null);

    const candidates = await ctx.resolver.resolveLoginCandidates("u@x.com", "company");

    expect(candidates).toHaveLength(0);
    expect(ctx.userRepo.findOneByEmailAndScope).not.toHaveBeenCalled();
  });

  it("READ on, no module, registry empty → ZERO-presence net returns the legacy single candidate", async () => {
    const ctx = build({ [READ]: true, [DUAL_WRITE]: true });
    ctx.registry.findByEmailLower.mockResolvedValue([]);
    ctx.userRepo.findOrbitUserByEmail.mockResolvedValue(userRow(7, "orbit:student"));

    const candidates = await ctx.resolver.resolveLoginCandidates("u@x.com", null);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].module).toBe("student");
  });
});
