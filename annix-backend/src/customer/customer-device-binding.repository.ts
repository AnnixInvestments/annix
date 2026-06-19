import { CrudRepository } from "../lib/persistence/crud-repository";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import { AuthDeviceBindingRepository } from "../shared/auth/auth-device-binding.repository";
import { CustomerDeviceBinding } from "./entities/customer-device-binding.entity";

export abstract class CustomerDeviceBindingRepository extends AuthDeviceBindingRepository<CustomerDeviceBinding> {
  abstract withTransaction(context: TransactionContext): CrudRepository<CustomerDeviceBinding>;
}
