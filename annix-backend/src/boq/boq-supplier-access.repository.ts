import { CrudRepository } from "../lib/persistence/crud-repository";
import { BoqSupplierAccess, SupplierBoqStatus } from "./entities/boq-supplier-access.entity";

export interface BoqSupplierStatusCount {
  boqId: number;
  status: string;
  count: string;
}

export abstract class BoqSupplierAccessRepository extends CrudRepository<BoqSupplierAccess> {
  abstract deleteByBoqId(boqId: number): Promise<void>;
  abstract countDistinctSuppliersByStatusForBoqs(
    boqIds: number[],
  ): Promise<BoqSupplierStatusCount[]>;
  abstract findByBoqAndSupplier(
    boqId: number,
    supplierProfileId: number,
  ): Promise<BoqSupplierAccess | null>;
  abstract findBySupplier(
    supplierProfileId: number,
    status?: SupplierBoqStatus,
  ): Promise<BoqSupplierAccess[]>;
  abstract findByBoqId(boqId: number): Promise<BoqSupplierAccess[]>;
  abstract findBySupplierAndStatuses(
    supplierProfileId: number,
    statuses: SupplierBoqStatus[],
  ): Promise<BoqSupplierAccess[]>;
  abstract findByBoqIdsExcludingStatus(
    boqIds: number[],
    excludedStatus: SupplierBoqStatus,
  ): Promise<BoqSupplierAccess[]>;
}
