import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BrandingType, Company, CompanyType } from "../entities/company.entity";
import { CompanyModuleSubscription } from "../entities/company-module-subscription.entity";
import { Contact } from "../entities/contact.entity";

export class CompanyResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: CompanyType })
  companyType: CompanyType;

  @ApiPropertyOptional({ nullable: true })
  registrationNumber: string | null;

  @ApiPropertyOptional({ nullable: true })
  customerCode: string | null;

  @ApiPropertyOptional({ nullable: true })
  vatNumber: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  contactPerson: string | null;

  @ApiPropertyOptional({ nullable: true })
  streetAddress: string | null;

  @ApiPropertyOptional({ nullable: true })
  city: string | null;

  @ApiPropertyOptional({ nullable: true })
  province: string | null;

  @ApiPropertyOptional({ nullable: true })
  postalCode: string | null;

  @ApiPropertyOptional({ nullable: true })
  addressJsonb: Record<string, string> | null;

  @ApiPropertyOptional({ nullable: true })
  notes: string | null;

  @ApiPropertyOptional({ nullable: true })
  websiteUrl: string | null;

  @ApiProperty({ enum: BrandingType })
  brandingType: BrandingType;

  @ApiProperty()
  brandingAuthorized: boolean;

  @ApiPropertyOptional({ nullable: true })
  primaryColor: string | null;

  @ApiPropertyOptional({ nullable: true })
  accentColor: string | null;

  @ApiPropertyOptional({ nullable: true })
  logoUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  heroImageUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  smtpHost: string | null;

  @ApiPropertyOptional({ nullable: true })
  smtpPort: number | null;

  @ApiPropertyOptional({ nullable: true })
  smtpUser: string | null;

  @ApiPropertyOptional({ nullable: true })
  smtpPassEncrypted: Buffer | null;

  @ApiPropertyOptional({ nullable: true })
  smtpFromName: string | null;

  @ApiPropertyOptional({ nullable: true })
  smtpFromEmail: string | null;

  @ApiProperty({ type: [String] })
  notificationEmails: string[];

  @ApiPropertyOptional({ nullable: true })
  emailConfig: Record<string, string> | null;

  @ApiProperty()
  pipingLossFactorPct: number;

  @ApiProperty()
  flatPlateLossFactorPct: number;

  @ApiProperty()
  structuralSteelLossFactorPct: number;

  @ApiProperty()
  qcEnabled: boolean;

  @ApiProperty()
  messagingEnabled: boolean;

  @ApiProperty()
  staffLeaveEnabled: boolean;

  @ApiProperty()
  workflowEnabled: boolean;

  @ApiPropertyOptional({ nullable: true })
  firebaseUid: string | null;

  @ApiPropertyOptional({ nullable: true })
  tradingName: string | null;

  @ApiPropertyOptional({ nullable: true })
  legalName: string | null;

  @ApiPropertyOptional({ nullable: true })
  industry: string | null;

  @ApiPropertyOptional({ nullable: true })
  companySize: string | null;

  @ApiProperty()
  country: string;

  @ApiProperty()
  currencyCode: string;

  @ApiPropertyOptional({ nullable: true })
  beeLevel: number | null;

  @ApiPropertyOptional({ nullable: true })
  beeCertificateExpiry: Date | null;

  @ApiPropertyOptional({ nullable: true })
  beeVerificationAgency: string | null;

  @ApiProperty()
  isExemptMicroEnterprise: boolean;

  @ApiPropertyOptional({ nullable: true })
  beeExpiryNotificationSentAt: Date | null;

  @ApiProperty()
  onboardingComplete: boolean;

  @ApiPropertyOptional({ nullable: true })
  ownerUserId: number | null;

  @ApiPropertyOptional({ nullable: true })
  ownerCompanyId: number | null;

  @ApiPropertyOptional({ type: [Object] })
  moduleSubscriptions: CompanyModuleSubscription[];

  @ApiPropertyOptional({ type: [Object] })
  contacts: Contact[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export function toCompanyResponse(company: Company): CompanyResponseDto {
  return {
    id: company.id,
    name: company.name,
    companyType: company.companyType,
    registrationNumber: company.registrationNumber,
    customerCode: company.customerCode,
    vatNumber: company.vatNumber,
    phone: company.phone,
    email: company.email,
    contactPerson: company.contactPerson,
    streetAddress: company.streetAddress,
    city: company.city,
    province: company.province,
    postalCode: company.postalCode,
    addressJsonb: company.addressJsonb,
    notes: company.notes,
    websiteUrl: company.websiteUrl,
    brandingType: company.brandingType,
    brandingAuthorized: company.brandingAuthorized,
    primaryColor: company.primaryColor,
    accentColor: company.accentColor,
    logoUrl: company.logoUrl,
    heroImageUrl: company.heroImageUrl,
    smtpHost: company.smtpHost,
    smtpPort: company.smtpPort,
    smtpUser: company.smtpUser,
    smtpPassEncrypted: company.smtpPassEncrypted,
    smtpFromName: company.smtpFromName,
    smtpFromEmail: company.smtpFromEmail,
    notificationEmails: company.notificationEmails,
    emailConfig: company.emailConfig,
    pipingLossFactorPct: company.pipingLossFactorPct,
    flatPlateLossFactorPct: company.flatPlateLossFactorPct,
    structuralSteelLossFactorPct: company.structuralSteelLossFactorPct,
    qcEnabled: company.qcEnabled,
    messagingEnabled: company.messagingEnabled,
    staffLeaveEnabled: company.staffLeaveEnabled,
    workflowEnabled: company.workflowEnabled,
    firebaseUid: company.firebaseUid,
    tradingName: company.tradingName,
    legalName: company.legalName,
    industry: company.industry,
    companySize: company.companySize,
    country: company.country,
    currencyCode: company.currencyCode,
    beeLevel: company.beeLevel,
    beeCertificateExpiry: company.beeCertificateExpiry,
    beeVerificationAgency: company.beeVerificationAgency,
    isExemptMicroEnterprise: company.isExemptMicroEnterprise,
    beeExpiryNotificationSentAt: company.beeExpiryNotificationSentAt,
    onboardingComplete: company.onboardingComplete,
    ownerUserId: company.ownerUserId,
    ownerCompanyId: company.ownerCompanyId,
    moduleSubscriptions: company.moduleSubscriptions,
    contacts: company.contacts,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}
