import { Injectable } from "@nestjs/common";

interface Integration {
  id: string;
  name: string;
  status: string;
  description: string;
}

interface ConnectionStatus {
  connected: boolean;
  lastSync: string | null;
}

const AVAILABLE_INTEGRATIONS: Integration[] = [
  {
    id: "sage",
    name: "Sage Business Cloud",
    status: "coming_soon",
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
  availableIntegrations(): Integration[] {
    return AVAILABLE_INTEGRATIONS;
  }

  connectionStatus(_companyId: number, _integrationId: string): ConnectionStatus {
    return { connected: false, lastSync: null };
  }
}
