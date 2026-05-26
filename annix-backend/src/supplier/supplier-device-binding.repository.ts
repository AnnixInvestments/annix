import { CrudRepository } from "../lib/persistence/crud-repository";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import { AuthDeviceBindingRepository } from "../shared/auth/auth-device-binding.repository";
import { SupplierDeviceBinding } from "./entities/supplier-device-binding.entity";

export abstract class SupplierDeviceBindingRepository extends AuthDeviceBindingRepository<SupplierDeviceBinding> {
  abstract withTransaction(context: TransactionContext): CrudRepository<SupplierDeviceBinding>;
}
