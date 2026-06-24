import { Address, ContactDetails } from "../../lib/value-objects";

export class RubberAppProfile {
  id: number;

  legalName: string | null;

  tradingName: string | null;

  vatNumber: string | null;

  registrationNumber: string | null;

  address: Address | null;

  postalAddress: string | null;

  deliveryAddress: string | null;

  contact: ContactDetails | null;

  websiteUrl: string | null;

  logoUrl: string | null;

  heroUrl: string | null;

  primaryColor: string | null;

  accentColor: string | null;

  updatedAt: Date;
}
