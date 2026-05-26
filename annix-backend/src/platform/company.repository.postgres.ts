import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, In, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CompanyRepository } from "./company.repository";
import type { CompanyPage, CompanySearchFilters } from "./company.service";
import { Company, CompanyType } from "./entities/company.entity";

@Injectable()
export class PostgresCompanyRepository
  extends TypeOrmCrudRepository<Company>
  implements CompanyRepository
{
  constructor(@InjectRepository(Company) repository: Repository<Company>) {
    super(repository);
  }

  build(data: Partial<Company>): Company {
    return this.repository.create(data as TypeOrmDeepPartial<Company>);
  }

  findByTypeAndNameLike(
    companyType: CompanyType,
    namePattern: string | null,
    limit: number,
  ): Promise<Company[]> {
    const where = namePattern ? { companyType, name: ILike(namePattern) } : { companyType };
    return this.repository.find({
      where,
      order: { name: "ASC" },
      take: limit,
    });
  }

  findOneByIdAndType(id: number, companyType: CompanyType): Promise<Company | null> {
    return this.repository.findOne({ where: { id, companyType } });
  }

  findByIds(ids: number[]): Promise<Company[]> {
    return this.repository.find({ where: { id: In(ids) } });
  }

  findByRegistrationNumber(registrationNumber: string): Promise<Company | null> {
    return this.repository.findOne({ where: { registrationNumber } });
  }

  async search(filters: CompanySearchFilters): Promise<CompanyPage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.repository
      .createQueryBuilder("company")
      .leftJoinAndSelect("company.moduleSubscriptions", "sub", "sub.disabled_at IS NULL");

    if (filters.companyType) {
      qb.andWhere("company.company_type = :companyType", { companyType: filters.companyType });
    }

    if (filters.search) {
      qb.andWhere(
        "(company.name ILIKE :search OR company.trading_name ILIKE :search OR company.legal_name ILIKE :search)",
        { search: `%${filters.search}%` },
      );
    }

    if (filters.hasModule) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM company_module_subscriptions cms
          WHERE cms.company_id = company.id
            AND cms.module_code = :moduleCode
            AND cms.disabled_at IS NULL
        )`,
        { moduleCode: filters.hasModule },
      );
    }

    qb.orderBy("company.name", "ASC");

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return { data, total, page, limit };
  }

  findOnboardingStatusById(id: number): Promise<Company | null> {
    return this.repository.findOne({
      where: { id },
      select: { id: true, onboardingComplete: true },
    });
  }

  companiesWithModule(moduleCode: string): Promise<Company[]> {
    return this.repository
      .createQueryBuilder("company")
      .innerJoin(
        "company_module_subscriptions",
        "sub",
        "sub.company_id = company.id AND sub.module_code = :moduleCode AND sub.disabled_at IS NULL",
        { moduleCode },
      )
      .orderBy("company.name", "ASC")
      .getMany();
  }
}
