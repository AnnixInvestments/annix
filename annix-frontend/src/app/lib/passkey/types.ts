export interface PasskeySummary {
  id: number;
  deviceName: string | null;
  transports: string[];
  backupEligible: boolean;
  backupState: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface PasskeyLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
}
