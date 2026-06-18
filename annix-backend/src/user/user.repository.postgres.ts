import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, In, LessThan, Like, MoreThan, Repository } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { type DeepPartial } from "../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { User } from "./entities/user.entity";
import { UserRepository } from "./user.repository";

@Injectable()
export class PostgresUserRepository extends TypeOrmCrudRepository<User> implements UserRepository {
  constructor(@InjectRepository(User) repository: Repository<User>) {
    super(repository);
  }

  instantiate(data: DeepPartial<User>): User {
    return this.repository.create(data);
  }

  findAllWithRoles(): Promise<User[]> {
    return this.repository.find({ relations: ["roles"] });
  }

  findByIdWithRoles(id: number): Promise<User | null> {
    return this.repository.findOne({ where: { id }, relations: ["roles"] });
  }

  findByEmailWithRoles(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email }, relations: ["roles"] });
  }

  findOrbitUserById(id: number): Promise<User | null> {
    return this.repository.findOne({ where: { id, appScope: Like("orbit:%") } });
  }

  findByIds(ids: number[]): Promise<User[]> {
    return this.repository.findBy({ id: In(ids) });
  }

  findByIdsWithRoles(ids: number[]): Promise<User[]> {
    return this.repository.find({ where: { id: In(ids) }, relations: ["roles"] });
  }

  async deleteById(id: number): Promise<number> {
    const result = await this.repository.delete(id);
    return result.affected ?? 0;
  }

  findByEmailVerificationToken(token: string): Promise<User | null> {
    return this.repository.findOne({ where: { emailVerificationToken: token } });
  }

  findByResetPasswordToken(token: string): Promise<User | null> {
    return this.repository.findOne({ where: { resetPasswordToken: token } });
  }

  countUnverifiedCreatedBefore(cutoff: Date): Promise<number> {
    return this.repository.count({
      where: {
        createdAt: LessThan(cutoff),
        emailVerified: false,
      },
    });
  }

  async deleteUnverifiedCreatedBefore(cutoff: Date): Promise<number> {
    const result = await this.repository.delete({
      createdAt: LessThan(cutoff),
      emailVerified: false,
    });
    return result.affected ?? 0;
  }

  findOneByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  findOneByEmailAndScope(email: string, appScope: string): Promise<User | null> {
    return this.repository.findOne({ where: { email: ILike(email), appScope } });
  }

  findByValidEmailVerificationToken(token: string, notExpiredAfter: Date): Promise<User | null> {
    return this.repository.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: MoreThan(notExpiredAfter),
      },
    });
  }

  findByValidResetPasswordToken(token: string, notExpiredAfter: Date): Promise<User | null> {
    return this.repository.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: MoreThan(notExpiredAfter),
      },
    });
  }

  findOneByEmailCaseInsensitive(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email: ILike(email) } });
  }

  findOneByEmailAnyScope(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email: ILike(email) } });
  }

  findOneByEmailCaseInsensitiveWithRoles(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email: ILike(email) },
      relations: ["roles"],
    });
  }

  async updateByEmailCaseInsensitive(email: string, changes: DeepPartial<User>): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update()
      .set(changes as QueryDeepPartialEntity<User>)
      .where("LOWER(email) = LOWER(:email)", { email })
      .execute();
  }

  async updateCompanyId(userId: number, companyId: number | null): Promise<void> {
    await this.repository.update(userId, {
      companyId,
    } as QueryDeepPartialEntity<User>);
  }

  findAllOrderedByEmail(): Promise<User[]> {
    return this.repository.find({ order: { email: "ASC" } });
  }

  searchByEmailOrName(query: string, limit: number): Promise<User[]> {
    const normalized = `%${query.toLowerCase()}%`;
    return this.repository
      .createQueryBuilder("user")
      .where("LOWER(user.email) LIKE :query", { query: normalized })
      .orWhere("LOWER(user.firstName) LIKE :query", { query: normalized })
      .orWhere("LOWER(user.lastName) LIKE :query", { query: normalized })
      .orderBy("user.email", "ASC")
      .limit(limit)
      .getMany();
  }

  async findIdsByRoleName(roleName: string): Promise<number[]> {
    const users = await this.repository
      .createQueryBuilder("user")
      .innerJoin("user.roles", "role", "role.name = :roleName", { roleName })
      .select("user.id")
      .getMany();
    return users.map((u) => u.id);
  }

  countByCompanyId(companyId: number): Promise<number> {
    return this.repository.count({ where: { companyId } });
  }

  async findAdminOrEmployeesPaginated(params: {
    search?: string;
    role?: string;
    skip: number;
    take: number;
  }): Promise<{ users: User[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.roles", "roles")
      .where("(roles.name = :admin OR roles.name = :employee)", {
        admin: "admin",
        employee: "employee",
      });

    if (params.search) {
      qb.andWhere("(user.email LIKE :search OR user.username LIKE :search)", {
        search: `%${params.search}%`,
      });
    }

    if (params.role) {
      qb.andWhere("roles.name = :role", { role: params.role });
    }

    const total = await qb.getCount();
    const users = await qb.skip(params.skip).take(params.take).orderBy("user.id", "DESC").getMany();

    return { users, total };
  }

  findAllIdAndEmail(): Promise<Pick<User, "id" | "email">[]> {
    return this.repository.find({ select: ["id", "email"] });
  }
}
