import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { AnnixOrbitTalentCandidateRepository } from "../repositories/annix-orbit-talent-candidate.repository";
import type { AnnixOrbitTalentCredentialRepository } from "../repositories/annix-orbit-talent-credential.repository";
import type { OrbitCredentialTypeRepository } from "../repositories/orbit-credential-type.repository";
import { AnnixOrbitTalentCredentialService } from "./annix-orbit-talent-credential.service";

const COMPANY = 10;
const OTHER_COMPANY = 99;
const CANDIDATE = 5;

function makeService() {
  const credentialRepo = {
    findByCandidate: jest.fn(),
    listForCandidates: jest.fn(),
    expiringForCompany: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    deleteById: jest.fn(),
  } as unknown as jest.Mocked<AnnixOrbitTalentCredentialRepository>;
  const candidateRepo = {
    findByIdForCompany: jest.fn(),
  } as unknown as jest.Mocked<AnnixOrbitTalentCandidateRepository>;
  const credentialTypeRepo = {
    findByCode: jest.fn(),
  } as unknown as jest.Mocked<OrbitCredentialTypeRepository>;
  const service = new AnnixOrbitTalentCredentialService(
    credentialRepo,
    candidateRepo,
    credentialTypeRepo,
  );
  return { service, credentialRepo, candidateRepo, credentialTypeRepo };
}

describe("AnnixOrbitTalentCredentialService (issue #362 phase 3)", () => {
  it("rejects creating a credential against a candidate in another company", async () => {
    const { service, candidateRepo, credentialRepo } = makeService();
    candidateRepo.findByIdForCompany.mockResolvedValue(null);

    await expect(
      service.create(CANDIDATE, COMPANY, { credentialType: "medical" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(credentialRepo.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown credential type", async () => {
    const { service, candidateRepo, credentialTypeRepo, credentialRepo } = makeService();
    candidateRepo.findByIdForCompany.mockResolvedValue({ id: CANDIDATE } as never);
    credentialTypeRepo.findByCode.mockResolvedValue(null);

    await expect(
      service.create(CANDIDATE, COMPANY, { credentialType: "not_a_real_code" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(credentialRepo.create).not.toHaveBeenCalled();
  });

  it("creates a built-in credential type, stamping company + lowercased code", async () => {
    const { service, candidateRepo, credentialRepo } = makeService();
    candidateRepo.findByIdForCompany.mockResolvedValue({ id: CANDIDATE } as never);
    credentialRepo.create.mockImplementation(async (data) => ({ id: 1, ...data }) as never);

    const result = await service.create(CANDIDATE, COMPANY, {
      credentialType: "MEDICAL",
      issuingAuthority: "  Kathu Mine HSE  ",
    });

    expect(credentialRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: COMPANY,
        candidateId: CANDIDATE,
        credentialType: "medical",
        issuingAuthority: "Kathu Mine HSE",
        verified: false,
      }),
    );
    expect(result.status).toBeDefined();
  });

  it("accepts an admin-defined active credential type", async () => {
    const { service, candidateRepo, credentialTypeRepo, credentialRepo } = makeService();
    candidateRepo.findByIdForCompany.mockResolvedValue({ id: CANDIDATE } as never);
    credentialTypeRepo.findByCode.mockResolvedValue({
      code: "custom_ticket",
      active: true,
    } as never);
    credentialRepo.create.mockImplementation(async (data) => ({ id: 2, ...data }) as never);

    await service.create(CANDIDATE, COMPANY, { credentialType: "custom_ticket" });
    expect(credentialRepo.create).toHaveBeenCalled();
  });

  it("will not update a credential owned by another company", async () => {
    const { service, credentialRepo } = makeService();
    credentialRepo.findById.mockResolvedValue({ id: 7, companyId: OTHER_COMPANY } as never);

    await expect(service.update(7, COMPANY, { verified: true })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(credentialRepo.save).not.toHaveBeenCalled();
  });

  it("will not delete a credential owned by another company", async () => {
    const { service, credentialRepo } = makeService();
    credentialRepo.findById.mockResolvedValue({ id: 7, companyId: OTHER_COMPANY } as never);

    await expect(service.remove(7, COMPANY)).rejects.toBeInstanceOf(NotFoundException);
    expect(credentialRepo.deleteById).not.toHaveBeenCalled();
  });

  it("summarises expiring/expired credentials by distinct candidate for the dashboard", async () => {
    const { service, credentialRepo } = makeService();
    const today = new Date().toISOString().slice(0, 10);
    const past = "2000-01-01";
    const future = "2999-01-01";
    credentialRepo.expiringForCompany.mockResolvedValue([
      { id: 1, candidateId: 100, credentialType: "medical", expiresAt: past },
      { id: 2, candidateId: 100, credentialType: "first_aid", expiresAt: past },
      { id: 3, candidateId: 200, credentialType: "working_at_heights", expiresAt: today },
      { id: 4, candidateId: 300, credentialType: "blasting", expiresAt: future },
    ] as never);

    const summary = await service.expiringSummaryForCompany(COMPANY, 30);

    // candidate 300's future credential is filtered out; 100 (x2 expired) + 200 (expiring) remain
    expect(summary.candidateCount).toBe(2);
    expect(summary.credentialCount).toBe(3);
    expect(summary.expiredCount).toBe(2);
    expect(summary.expiringCount).toBe(1);
  });
});
