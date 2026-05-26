import { AuthSessionRepository } from "../shared/auth/auth-session.repository";
import { SupplierSession } from "./entities/supplier-session.entity";

export abstract class SupplierSessionRepository extends AuthSessionRepository<SupplierSession> {}
