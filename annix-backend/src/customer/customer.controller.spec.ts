import { Test, TestingModule } from "@nestjs/testing";
import { fromISO } from "../lib/datetime";
import { BrandingType, Company, CompanyType } from "../platform/entities/company.entity";
import { CustomerController } from "./customer.controller";
import { CustomerService } from "./customer.service";
import { CustomerAuthGuard } from "./guards/customer-auth.guard";
import { CustomerDeviceGuard } from "./guards/customer-device.guard";

describe("CustomerController (company endpoints)", () => {
  let controller: CustomerController;
  let customerService: jest.Mocked<CustomerService>;

  const CUSTOMER_ID = 42;
  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const mockRequest = {
    customer: { customerId: CUSTOMER_ID },
    headers: {},
    ip: "10.0.0.1",
    socket: { remoteAddress: "10.0.0.1" },
  };

  const mockCompany = (overrides: Partial<Company> = {}): Company =>
    ({
      id: 7,
      name: "Acme Industrial",
      companyType: CompanyType.CUSTOMER,
      registrationNumber: "2020/123456/07",
      customerCode: null,
      vatNumber: "4123456789",
      phone: "+27 21 000 0123",
      email: "info@acme.example",
      contactPerson: "Jane Doe",
      streetAddress: "456 Industrial Road",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "8001",
      addressJsonb: null,
      notes: null,
      websiteUrl: "https://acme.example",
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
    const mockCustomerService = {
      getCompany: jest.fn(),
      updateCompanyAddress: jest.fn(),
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      changePassword: jest.fn(),
      getDashboard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerController],
      providers: [{ provide: CustomerService, useValue: mockCustomerService }],
    })
      .overrideGuard(CustomerAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CustomerDeviceGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CustomerController>(CustomerController);
    customerService = module.get(CustomerService);
    jest.clearAllMocks();
  });

  describe("GET /customer/company (getCompany)", () => {
    it("returns the flat company response shape with the expected field set", async () => {
      const company = mockCompany();
      customerService.getCompany.mockResolvedValue(company);

      const result = await controller.getCompany(mockRequest as any);

      expect(customerService.getCompany).toHaveBeenCalledWith(CUSTOMER_ID);
      expect(result.id).toBe(7);
      expect(result.streetAddress).toBe("456 Industrial Road");
      expect(result.city).toBe("Cape Town");
      expect(result.province).toBe("Western Cape");
      expect(result.postalCode).toBe("8001");
      expect(result.phone).toBe("+27 21 000 0123");
    });

    it("reproduces the raw entity values byte-for-byte (deep equal)", async () => {
      const company = mockCompany();
      customerService.getCompany.mockResolvedValue(company);

      const result = await controller.getCompany(mockRequest as any);

      expect(JSON.parse(JSON.stringify(result))).toEqual(JSON.parse(JSON.stringify(company)));
    });

    it("exposes the documented flat address/contact contract keys", async () => {
      customerService.getCompany.mockResolvedValue(mockCompany());

      const result = await controller.getCompany(mockRequest as any);

      const keys = Object.keys(result);
      for (const key of [
        "id",
        "name",
        "streetAddress",
        "city",
        "province",
        "postalCode",
        "phone",
        "email",
        "contactPerson",
      ]) {
        expect(keys).toContain(key);
      }
    });
  });

  describe("PATCH /customer/company/address (updateCompanyAddress)", () => {
    it("persists the provided address fields and returns the flat shape", async () => {
      const dto = {
        streetAddress: "1 New Street",
        city: "Durban",
        provinceState: "KwaZulu-Natal",
        postalCode: "4001",
        primaryPhone: "+27 31 000 0123",
      };
      const updated = mockCompany({
        streetAddress: "1 New Street",
        city: "Durban",
        province: "KwaZulu-Natal",
        postalCode: "4001",
        phone: "+27 31 000 0123",
      });
      customerService.updateCompanyAddress.mockResolvedValue(updated);

      const result = await controller.updateCompanyAddress(dto, mockRequest as any);

      expect(customerService.updateCompanyAddress).toHaveBeenCalledWith(
        CUSTOMER_ID,
        dto,
        "10.0.0.1",
      );
      expect(result.streetAddress).toBe("1 New Street");
      expect(result.city).toBe("Durban");
      expect(result.province).toBe("KwaZulu-Natal");
      expect(result.postalCode).toBe("4001");
      expect(result.phone).toBe("+27 31 000 0123");
    });
  });
});
