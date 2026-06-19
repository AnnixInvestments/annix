export class HdpeStandard {
  id: number;

  code: string; // e.g., 'ISO_4427', 'EN_12201', 'ASTM_F714'

  name: string; // Full name of the standard

  description: string; // Description of what this standard covers

  organization: string; // ISO, ASTM, EN, AWWA, etc.

  region: string; // International, US, EU, etc.

  applicableTo: string; // pipes, fittings, both

  displayOrder: number;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
