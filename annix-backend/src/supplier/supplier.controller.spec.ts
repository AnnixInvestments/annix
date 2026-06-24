import { Test, TestingModule } from "@nestjs/testing";
import { fromISO } from "../lib/datetime";
import { BrandingType, Company, CompanyType } from "../platform/entities/company.entity";
import { SupplierAuthGuard } from "./guards/supplier-auth.guard";
import { SupplierController } from "./supplier.controller";
import { SupplierService } from "./supplier.service";

describe("SupplierController (company endpoints)", () => {
  let controller: SupplierController;
  let supplierService: jest.Mocked<SupplierService>;

  const SUPPLIER_ID = 99;
  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockRequest = {
    supplier: { supplierId: SUPPLIER_ID },
    headers: {},
    ip: "10.0.0.2",
    socket: { remoteAddress: "10.0.0.2" },
  };

  const mockCompany = (overrides: Partial<Company> = {}): Company =>
    ({
      id: 12,
      name: "ABC Supplies (Pty) Ltd",
      companyType: CompanyType.SUPPLIER,
      registrationNumber: "2021/654321/07",
      customerCode: null,
      vatNumber: "4987654321",
      phone: "+27 21 000 0100",
      email: "info@abc.example",
      contactPerson: "John Smith",
      streetAddress: "456 Supplier Avenue",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8001",
      addressJsonb: null,
      notes: null,
      websiteUrl: "https://abc.example",
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
      tradingName: "ABC Supplies",
      legalName: "ABC Supplies (Pty) Ltd",
      industry: "Manufacturing",
      companySize: "medium",
      country: "South Africa",
      currencyCode: "ZAR",
      beeLevel: 3,
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
    const mockSupplierService = {
      getProfile: jest.fn(),
      saveCompanyDetails: jest.fn(),
      updateProfile: jest.fn(),
      getDashboard: jest.fn(),
      getOnboardingStatus: jest.fn(),
      getDocuments: jest.fn(),
      uploadDocument: jest.fn(),
      deleteDocument: jest.fn(),
      submitOnboarding: jest.fn(),
      getCapabilities: jest.fn(),
      saveCapabilities: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierController],
      providers: [{ provide: SupplierService, useValue: mockSupplierService }],
    })
      .overrideGuard(SupplierAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SupplierController>(SupplierController);
    supplierService = module.get(SupplierService);
    jest.clearAllMocks();
  });

  describe("POST /supplier/onboarding/company (saveCompanyDetails)", () => {
    it("returns the flat company response with the expected fields", async () => {
      const company = mockCompany();
      supplierService.saveCompanyDetails.mockResolvedValue(company);

      const dto = { legalName: "ABC Supplies (Pty) Ltd" } as any;
      const result = await controller.saveCompanyDetails(dto, mockRequest as any);

      expect(supplierService.saveCompanyDetails).toHaveBeenCalledWith(SUPPLIER_ID, dto, "10.0.0.2");
      expect(result.id).toBe(12);
      expect(result.legalName).toBe("ABC Supplies (Pty) Ltd");
      expect(result.streetAddress).toBe("456 Supplier Avenue");
      expect(result.city).toBe("Cape Town");
      expect(result.province).toBe("Western Cape");
      expect(result.postalCode).toBe("8001");
      expect(result.phone).toBe("+27 21 000 0100");
    });

    it("reproduces the raw entity values byte-for-byte (deep equal)", async () => {
      const company = mockCompany();
      supplierService.saveCompanyDetails.mockResolvedValue(company);

      const result = await controller.saveCompanyDetails({} as any, mockRequest as any);

      expect(JSON.parse(JSON.stringify(result))).toEqual(JSON.parse(JSON.stringify(company)));
    });
  });

  describe("GET /supplier/profile (getProfile)", () => {
    it("returns the profile with the embedded company mapped to the flat DTO", async () => {
      const company = mockCompany();
      const profile = {
        id: SUPPLIER_ID,
        firstName: "John",
        lastName: "Smith",
        companyId: 12,
        company,
        documents: [],
        onboarding: null,
      };
      supplierService.getProfile.mockResolvedValue(profile as any);

      const result = await controller.getProfile(mockRequest as any);

      expect(supplierService.getProfile).toHaveBeenCalledWith(SUPPLIER_ID);
      expect(result.id).toBe(SUPPLIER_ID);
      expect(result.firstName).toBe("John");
      expect(result.company.id).toBe(12);
      expect(result.company.streetAddress).toBe("456 Supplier Avenue");
      expect(result.company.city).toBe("Cape Town");
      expect(result.company.province).toBe("Western Cape");
      expect(result.company.postalCode).toBe("8001");
      expect(result.company.phone).toBe("+27 21 000 0100");
    });

    it("preserves the embedded company values byte-for-byte", async () => {
      const company = mockCompany();
      const profile = { id: SUPPLIER_ID, company };
      supplierService.getProfile.mockResolvedValue(profile as any);

      const result = await controller.getProfile(mockRequest as any);

      expect(JSON.parse(JSON.stringify(result.company))).toEqual(
        JSON.parse(JSON.stringify(company)),
      );
    });
  });
});
