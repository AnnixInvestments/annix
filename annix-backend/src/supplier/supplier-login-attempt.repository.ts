import { AuthLoginAttemptRepository } from "../shared/auth/auth-login-attempt.repository";
import { SupplierLoginAttempt } from "./entities/supplier-login-attempt.entity";

export abstract class SupplierLoginAttemptRepository extends AuthLoginAttemptRepository<SupplierLoginAttempt> {}
