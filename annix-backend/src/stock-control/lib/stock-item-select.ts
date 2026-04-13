import type { FindOptionsSelect } from "typeorm";
import type { StockItem } from "../entities/stock-item.entity";

export const STOCK_ITEM_MATCH_SELECT: FindOptionsSelect<StockItem> = {
  id: true,
  sku: true,
  name: true,
  category: true,
  quantity: true,
  unitOfMeasure: true,
  costPerUnit: true,
  packSizeLitres: true,
  componentGroup: true,
  componentRole: true,
  mixRatio: true,
  thicknessMm: true,
  widthMm: true,
  lengthM: true,
  compoundCode: true,
  isLeftover: true,
  rollNumber: true,
  sourceJobCardId: true,
  locationId: true,
  companyId: true,
  color: true,
};
