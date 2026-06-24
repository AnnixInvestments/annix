import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AuditService } from "../audit/audit.service";
import { fromISO } from "../lib/datetime";
import { Address, ContactDetails } from "../lib/value-objects";
import { CompanyRepository } from "../platform/company.repository";
import { BrandingType, Company, CompanyType } from "../platform/entities/company.entity";
import { RfqRepository } from "../rfq/rfq.repository";
import { RfqDraftRepository } from "../rfq/rfq-draft.repository";
import { UserRepository } from "../user/user.repository";
import { CustomerService } from "./customer.service";
import { CustomerProfileRepository } from "./customer-profile.repository";

describe("CustomerService.updateCompanyAddress", () => {
  let service: CustomerService;
  let companyRepo: jest.Mocked<CompanyRepository>;
  let profileRepository: jest.Mocked<CustomerProfileRepository>;

  const CUSTOMER_ID = 42;
  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockCompany = (overrides: Partial<Company> = {}): Company =>
    ({
      id: 7,
      name: "Acme Industrial",
      companyType: CompanyType.CUSTOMER,
      registrationNumber: "2020/123456/07",
      customerCode: null,
      vatNumber: "4123456789",
      contactPerson: "Jane Doe",
      address: Address.fromParts({
        streetAddress: "456 Industrial Road",
        city: "Cape Town",
        province: "Western Cape",
        postalCode: "8001",
      }),
      contact: ContactDetails.fromParts({
        phone: "+27 21 000 0123",
        email: "info@acme.example",
      }),
      addressJsonb: null,
      notes: null,
      websiteUrl: null,
      brandingType: BrandingType.ANNIX,
      brandingAuthorized: false,
      primaryColor: null,
      accentColor: null,
      logoUrl: null,
      heroImageUrl: null,
      smtpHost: null,
      smtpPort: null,
      smtpUser: null,
      smtpPassEncrypted: null,
      smtpFromName: null,
      smtpFromEmail: null,
      notificationEmails: [],
      emailConfig: null,
      pipingLossFactorPct: 45,
      flatPlateLossFactorPct: 20,
      structuralSteelLossFactorPct: 30,
      qcEnabled: true,
      messagingEnabled: false,
      staffLeaveEnabled: false,
      workflowEnabled: true,
      firebaseUid: null,
      tradingName: "Acme",
      legalName: "Acme Industrial (Pty) Ltd",
      industry: null,
      companySize: null,
      country: "South Africa",
      currencyCode: "ZAR",
      beeLevel: null,
      beeCertificateExpiry: null,
      beeVerificationAgency: null,
      isExemptMicroEnterprise: false,
      beeExpiryNotificationSentAt: null,
      onboardingComplete: false,
      ownerUserId: null,
      ownerCompanyId: null,
      moduleSubscriptions: [],
      contacts: [],
      createdAt: testDate,
      updatedAt: testDate,
      ...overrides,
    }) as Company;

  beforeEach(async () => {
    const mockCompanyRepo = { save: jest.fn() };
    const mockProfileRepository = { findById: jest.fn() };
    const mockUserRepo = {};
    const mockAuditService = { log: jest.fn() };
    const mockRfqRepo = {};
    const mockRfqDraftRepo = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: CompanyRepository, useValue: mockCompanyRepo },
        { provide: CustomerProfileRepository, useValue: mockProfileRepository },
        { provide: UserRepository, useValue: mockUserRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: RfqRepository, useValue: mockRfqRepo },
        { provide: RfqDraftRepository, useValue: mockRfqDraftRepo },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    companyRepo = module.get(CompanyRepository);
    profileRepository = module.get(CustomerProfileRepository);
    jest.clearAllMocks();
  });

  it("persists the provided address fields onto the company", async () => {
    const company = mockCompany();
    profileRepository.findById.mockResolvedValue({ id: CUSTOMER_ID, company } as any);
    companyRepo.save.mockImplementation(async (entity: Company) => entity);

    const dto = {
      streetAddress: "1 New Street",
      city: "Durban",
      provinceState: "KwaZulu-Natal",
      postalCode: "4001",
      primaryPhone: "+27 31 000 0123",
    };

    const result = await service.updateCompanyAddress(CUSTOMER_ID, dto, "10.0.0.1");

    expect(companyRepo.save).toHaveBeenCalledTimes(1);
    const saved = companyRepo.save.mock.calls[0][0];
    expect(saved.address?.streetAddress).toBe("1 New Street");
    expect(saved.address?.city).toBe("Durban");
    expect(saved.address?.province).toBe("KwaZulu-Natal");
    expect(saved.address?.postalCode).toBe("4001");
    expect(saved.contact?.phone).toBe("+27 31 000 0123");
    expect(result.address?.streetAddress).toBe("1 New Street");
  });

  it("leaves untouched fields unchanged when only a subset is provided", async () => {
    const company = mockCompany();
    profileRepository.findById.mockResolvedValue({ id: CUSTOMER_ID, company } as any);
    companyRepo.save.mockImplementation(async (entity: Company) => entity);

    const result = await service.updateCompanyAddress(
      CUSTOMER_ID,
      { city: "Pretoria" },
      "10.0.0.1",
    );

    expect(result.address?.city).toBe("Pretoria");
    expect(result.address?.streetAddress).toBe("456 Industrial Road");
    expect(result.address?.postalCode).toBe("8001");
    expect(result.contact?.phone).toBe("+27 21 000 0123");
  });

  it("throws NotFoundException when the profile does not exist", async () => {
    profileRepository.findById.mockResolvedValue(null);

    await expect(
      service.updateCompanyAddress(CUSTOMER_ID, { city: "Pretoria" }, "10.0.0.1"),
    ).rejects.toThrow(NotFoundException);
  });
});
