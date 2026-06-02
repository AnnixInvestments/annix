import { CrudRepository, type DeepPartial } from "../lib/persistence/crud-repository";
import { User } from "./entities/user.entity";

export abstract class UserRepository extends CrudRepository<User> {
  abstract instantiate(data: DeepPartial<User>): User;
  abstract findAllWithRoles(): Promise<User[]>;
  abstract findByIdWithRoles(id: number): Promise<User | null>;
  abstract findByEmailWithRoles(email: string): Promise<User | null>;
  abstract findByIds(ids: number[]): Promise<User[]>;
  abstract findByIdsWithRoles(ids: number[]): Promise<User[]>;
  abstract deleteById(id: number): Promise<number>;
  abstract findOneByEmail(email: string): Promise<User | null>;
  abstract findOneByEmailAndScope(email: string, appScope: string): Promise<User | null>;
  abstract findByValidEmailVerificationToken(
    token: string,
    notExpiredAfter: Date,
  ): Promise<User | null>;
  abstract findByValidResetPasswordToken(
    token: string,
    notExpiredAfter: Date,
  ): Promise<User | null>;
  abstract findByEmailVerificationToken(token: string): Promise<User | null>;
  abstract findByResetPasswordToken(token: string): Promise<User | null>;
  abstract countUnverifiedCreatedBefore(cutoff: Date): Promise<number>;
  abstract deleteUnverifiedCreatedBefore(cutoff: Date): Promise<number>;
  abstract findOneByEmailCaseInsensitive(email: string): Promise<User | null>;
  abstract findOneByEmailCaseInsensitiveWithRoles(email: string): Promise<User | null>;
  abstract updateByEmailCaseInsensitive(email: string, changes: DeepPartial<User>): Promise<void>;
  abstract updateCompanyId(userId: number, companyId: number | null): Promise<void>;
  abstract findAllOrderedByEmail(): Promise<User[]>;
  abstract searchByEmailOrName(query: string, limit: number): Promise<User[]>;
  abstract findAdminOrEmployeesPaginated(params: {
    search?: string;
    role?: string;
    skip: number;
    take: number;
  }): Promise<{ users: User[]; total: number }>;
  abstract findIdsByRoleName(roleName: string): Promise<number[]>;
  abstract countByCompanyId(companyId: number): Promise<number>;
  abstract findAllIdAndEmail(): Promise<Pick<User, "id" | "email">[]>;
}
