import { fromISO } from "../../lib/datetime";
import { Address, ContactDetails } from "../../lib/value-objects";
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
    addressJsonb: { line1: "456 Industrial Road" },
    notes: "preferred",
    websiteUrl: "https://acme.example",
    brandingType: BrandingType.CUSTOM,
    brandingAuthorized: true,
    primaryColor: "#000000",
    accentColor: "#ffffff",
    logoUrl: "https://acme.example/logo.png",
    heroImageUrl: null,
    letterheadPath: null,
    emailSignaturePath: null,
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

  it("maps every exposed entity field onto the flat DTO, flattening the nested value-objects", () => {
    const {
      address,
      contact,
      letterheadPath: _letterheadPath,
      emailSignaturePath: _emailSignaturePath,
      ...flatRest
    } = fullCompany;
    const result = toCompanyResponse(fullCompany);
    expect(result).toEqual({
      ...flatRest,
      streetAddress: address?.streetAddress ?? null,
      city: address?.city ?? null,
      province: address?.province ?? null,
      postalCode: address?.postalCode ?? null,
      phone: contact?.phone ?? null,
      email: contact?.email ?? null,
    });
  });

  it("never exposes the nested address/contact value-objects or the per-tenant branding paths on the DTO", () => {
    const result = toCompanyResponse(fullCompany);
    expect("address" in result).toBe(false);
    expect("contact" in result).toBe(false);
    expect("letterheadPath" in result).toBe(false);
    expect("emailSignaturePath" in result).toBe(false);
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
