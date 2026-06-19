export interface Director {
  name: string;
  title: string;
  email: string;
}

export class CompanyProfile {
  id: number;

  legalName: string;

  tradingName: string;

  registrationNumber: string;

  vatNumber: string | null;

  entityType: string | null;

  streetAddress: string | null;

  city: string | null;

  province: string | null;

  postalCode: string | null;

  country: string;

  phone: string | null;

  generalEmail: string | null;

  supportEmail: string | null;

  privacyEmail: string | null;

  demoRequestEmail: string | null;

  websiteUrl: string | null;

  informationOfficerName: string | null;

  informationOfficerEmail: string | null;

  jurisdiction: string;

  primaryDomain: string | null;

  noReplyEmail: string | null;

  mailerName: string | null;

  directors: Director[];

  createdAt: Date;

  updatedAt: Date;
}
