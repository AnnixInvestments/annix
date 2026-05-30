export class AdminInboundConfigRowDto {
  app: string;
  companyId: number | null;
  companyName: string;
  emailUser: string;
  enabled: boolean;
  lastPollAt: string | null;
  lastError: string | null;
}

export class AdminInboundConfigGroupDto {
  app: string;
  label: string;
  accounts: AdminInboundConfigRowDto[];
}

export class SetInboundEnabledDto {
  companyId: number | null;
  enabled: boolean;
}
