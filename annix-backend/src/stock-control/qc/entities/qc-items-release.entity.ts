import { Company } from "../../../platform/entities/company.entity";
import { StockControlCompany } from "../../entities/stock-control-company.entity";

export enum ItemReleaseResult {
  PASS = "pass",
  FAIL = "fail",
}

export interface ReleaseLineItem {
  itemCode: string;
  description: string;
  jtNumber: string | null;
  rubberSpec: string | null;
  paintingSpec: string | null;
  quantity: number;
  result: ItemReleaseResult;
  itemNo: string | null;
}

export interface ReleasePartySignOff {
  name: string | null;
  date: string | null;
  signatureUrl: string | null;
}

export class QcItemsRelease {
  id: number;

  company: StockControlCompany;

  companyId: number;

  jobCardId: number | null;

  cpoId: number | null;

  version: number;

  items: ReleaseLineItem[];

  totalQuantity: number;

  checkedByName: string | null;

  checkedByDate: string | null;

  checkedBySignature: string | null;

  plsSignOff: ReleasePartySignOff;

  mpsSignOff: ReleasePartySignOff;

  clientSignOff: ReleasePartySignOff;

  thirdPartySignOff: ReleasePartySignOff;

  comments: string | null;

  createdByName: string;

  createdById: number | null;

  unifiedCompany?: Company | null;

  unifiedCompanyId?: number | null;

  createdAt: Date;

  updatedAt: Date;
}
