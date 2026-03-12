import { Injectable } from "@nestjs/common";
import { SageService } from "./sage/sage.service";

export interface Integration {
  id: string;
  name: string;
  status: string;
  description: string;
}

export interface ConnectionStatus {
  connected: boolean;
  lastSync: string | null;
}

const AVAILABLE_INTEGRATIONS: Integration[] = [
  {
    id: "sage",
    name: "Sage Business Cloud",
    status: "available",
    description: "Sync company data and financial reports",
  },
  {
    id: "xero",
    name: "Xero",
    status: "coming_soon",
    description: "Sync accounting data and financial reports",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    status: "coming_soon",
    description: "Sync accounting data and financial reports",
  },
  {
    id: "payroll",
    name: "SimplePay",
    status: "coming_soon",
    description: "Import payroll data for compliance checking",
  },
];

@Injectable()
export class ComplySaIntegrationsService {
  constructor(private readonly sageService: SageService) {}

  availableIntegrations(): Integration[] {
    return AVAILABLE_INTEGRATIONS;
  }

  async connectionStatus(companyId: number, integrationId: string): Promise<ConnectionStatus> {
    if (integrationId === "sage") {
      return this.sageService.isConnected(companyId);
    }

    return { connected: false, lastSync: null };
  }
}
