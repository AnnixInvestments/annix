import { AuthLoginAttemptRepository } from "../shared/auth/auth-login-attempt.repository";
import { CustomerLoginAttempt } from "./entities/customer-login-attempt.entity";

export abstract class CustomerLoginAttemptRepository extends AuthLoginAttemptRepository<CustomerLoginAttempt> {
  abstract recentByProfile(
    customerProfileId: number,
    limit: number,
  ): Promise<CustomerLoginAttempt[]>;
}
