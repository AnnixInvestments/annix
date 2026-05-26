import { AuthDeviceBindingRepository } from "../shared/auth/auth-device-binding.repository";
import { CustomerDeviceBinding } from "./entities/customer-device-binding.entity";

export abstract class CustomerDeviceBindingRepository extends AuthDeviceBindingRepository<CustomerDeviceBinding> {}
