import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export enum PositectorProbeType {
  DFT_6000 = "6000",
  SPG = "SPG",
  SHD = "SHD",
  RTR = "RTR",
  DPM = "DPM",
  UTG = "UTG",
  AT = "AT",
}

export class PositectorDevice {
  id: number;

  company: StockControlCompany;

  companyId: number;

  deviceName: string;

  ipAddress: string;

  port: number;

  probeType: string | null;

  serialNumber: string | null;

  isActive: boolean;

  lastConnectedAt: Date | null;

  registeredByName: string;

  registeredById: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
