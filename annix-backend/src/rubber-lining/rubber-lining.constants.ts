import { SupplierCocType } from "./entities/rubber-supplier-coc.entity";

export const DEFAULT_SUPPLIER_NAMES: Record<SupplierCocType, string> = {
  [SupplierCocType.COMPOUNDER]: "S&N Rubber",
  [SupplierCocType.CALENDARER]: "Impilo",
};
