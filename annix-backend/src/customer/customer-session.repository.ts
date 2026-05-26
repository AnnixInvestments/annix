import { AuthSessionRepository } from "../shared/auth/auth-session.repository";
import { CustomerSession } from "./entities/customer-session.entity";

export abstract class CustomerSessionRepository extends AuthSessionRepository<CustomerSession> {}
