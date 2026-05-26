import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockControlRole, StockControlUser } from "../entities/stock-control-user.entity";
import { StockControlUserRepository } from "./stock-control-user.repository";

@Injectable()
export class PostgresStockControlUserRepository
  extends TypeOrmCrudRepository<StockControlUser>
  implements StockControlUserRepository
{
  constructor(@InjectRepository(StockControlUser) repository: Repository<StockControlUser>) {
    super(repository);
  }

  findOneByEmail(email: string): Promise<StockControlUser | null> {
    return this.repository.findOne({ where: { email } });
  }

  findOneByEmailCaseInsensitive(email: string): Promise<StockControlUser | null> {
    return this.repository.findOne({ where: { email: ILike(email) } });
  }

  findOneByEmailAndCompany(email: string, companyId: number): Promise<StockControlUser | null> {
    return this.repository.findOne({ where: { email, companyId } });
  }

  findOneByEmailVerificationToken(token: string): Promise<StockControlUser | null> {
    return this.repository.findOne({ where: { emailVerificationToken: token } });
  }

  findOneByResetToken(token: string): Promise<StockControlUser | null> {
    return this.repository.findOne({ where: { resetPasswordToken: token } });
  }

  findOneForCompany(id: number, companyId: number): Promise<StockControlUser | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findOneForCompanyWithCompany(id: number, companyId: number): Promise<StockControlUser | null> {
    return this.repository.findOne({ where: { id, companyId }, relations: ["company"] });
  }

  findOneByIdWithCompany(id: number): Promise<StockControlUser | null> {
    return this.repository.findOne({ where: { id }, relations: ["company"] });
  }

  findForCompanyOrderedByCreated(companyId: number): Promise<StockControlUser[]> {
    return this.repository.find({ where: { companyId }, order: { createdAt: "ASC" } });
  }

  findAllForCompany(companyId: number): Promise<StockControlUser[]> {
    return this.repository.find({ where: { companyId } });
  }

  countAdminsForCompany(companyId: number): Promise<number> {
    return this.repository.count({
      where: { companyId, role: StockControlRole.ADMIN },
    });
  }

  countForCompany(companyId: number): Promise<number> {
    return this.repository.count({ where: { companyId } });
  }

  findIdsByIdsForCompany(ids: number[], companyId: number): Promise<StockControlUser[]> {
    return this.repository.find({
      where: { id: In(ids.length > 0 ? ids : [0]), companyId },
      select: ["id"],
    });
  }

  findForCompanyByRoles(companyId: number, roles: string[]): Promise<StockControlUser[]> {
    return this.repository.find({
      where: roles.map((role) => ({ companyId, role })),
    });
  }

  findForCompanyByRolesOrdered(companyId: number, roles: string[]): Promise<StockControlUser[]> {
    return this.repository.find({
      where: { companyId, role: In(roles) },
      order: { name: "ASC" },
    });
  }

  findAllOrderedByEmailWithCompany(): Promise<StockControlUser[]> {
    return this.repository.find({
      relations: ["company"],
      order: { email: "ASC" },
    });
  }

  findAllOrderedById(): Promise<StockControlUser[]> {
    return this.repository.find({ order: { id: "ASC" } });
  }
}
