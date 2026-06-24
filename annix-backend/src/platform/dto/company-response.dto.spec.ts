import { fromISO } from "../../lib/datetime";
import { BrandingType, Company, CompanyType } from "../entities/company.entity";
import { toCompanyResponse } from "./company-response.dto";

describe("toCompanyResponse", () => {
  const testDate = fromISO("2026-01-15T10:00:00Z").toJSDate();

  const fullCompany: Company = {
    id: 7,
    name: "Acme Industrial",
    companyType: CompanyType.CUSTOMER,
    registrationNumber: "2020/123456/07",
    customerCode: "C-001",
    vatNumber: "4123456789",
    phone: "+27 21 000 0123",
    email: "info@acme.example",
    contactPerson: "Jane Doe",
    streetAddress: "456 Industrial Road",
    city: "Cape Town",
    province: "Western Cape",
    postalCode: "8001",
    addressJsonb: { line1: "456 Industrial Road" },
    notes: "preferred",
    websiteUrl: "https://acme.example",
    brandingType: BrandingType.CUSTOM,
    brandingAuthorized: true,
    primaryColor: "#000000",
    accentColor: "#ffffff",
    logoUrl: "https://acme.example/logo.png",
    heroImageUrl: null,
    smtpHost: "smtp.acme.example",
    smtpPort: 587,
    smtpUser: "mailer",
    smtpPassEncrypted: null,
    smtpFromName: "Acme",
    smtpFromEmail: "noreply@acme.example",
    notificationEmails: ["ops@acme.example"],
    emailConfig: { provider: "smtp" },
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
    beeCertificateExpiry: testDate,
    beeVerificationAgency: "Empowerdex",
    isExemptMicroEnterprise: false,
    beeExpiryNotificationSentAt: null,
    onboardingComplete: true,
    ownerUserId: 1,
    ownerCompanyId: 2,
    moduleSubscriptions: [],
    contacts: [],
    createdAt: testDate,
    updatedAt: testDate,
  };

  it("maps every entity field onto the flat DTO with identical values", () => {
    const result = toCompanyResponse(fullCompany);
    expect(result).toEqual(fullCompany);
  });

  it("produces identical JSON output to the raw entity", () => {
    const result = toCompanyResponse(fullCompany);
    expect(JSON.stringify(result)).toBe(JSON.stringify(fullCompany));
  });

  it("preserves the flat address and contact fields", () => {
    const result = toCompanyResponse(fullCompany);
    expect(result.streetAddress).toBe("456 Industrial Road");
    expect(result.city).toBe("Cape Town");
    expect(result.province).toBe("Western Cape");
    expect(result.postalCode).toBe("8001");
    expect(result.phone).toBe("+27 21 000 0123");
    expect(result.email).toBe("info@acme.example");
    expect(result.contactPerson).toBe("Jane Doe");
  });
});
