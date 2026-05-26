import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { CompanyType, RubberCompany } from "../entities/rubber-company.entity";
import { RubberCompanyRepository } from "./rubber-company.repository";

@Injectable()
export class PostgresRubberCompanyRepository
  extends TypeOrmCrudRepository<RubberCompany>
  implements RubberCompanyRepository
{
  constructor(@InjectRepository(RubberCompany) repository: Repository<RubberCompany>) {
    super(repository);
  }

  build(data: Partial<RubberCompany>): RubberCompany {
    return this.repository.create(data as TypeOrmDeepPartial<RubberCompany>);
  }

  findOneByIdOrFail(id: number): Promise<RubberCompany> {
    return this.repository.findOneByOrFail({ id });
  }

  findByCompanyType(companyType: CompanyType): Promise<RubberCompany[]> {
    return this.repository.find({
      where: { companyType },
    });
  }

  findOneByNameAndType(upperName: string, companyType: CompanyType): Promise<RubberCompany | null> {
    return this.repository
      .createQueryBuilder("c")
      .where("UPPER(c.name) = :name", { name: upperName })
      .andWhere("c.company_type = :type", { type: companyType })
      .getOne();
  }

  findOneByNameLike(namePattern: string): Promise<RubberCompany | null> {
    return this.repository
      .createQueryBuilder("company")
      .where("LOWER(company.name) LIKE LOWER(:name)", { name: namePattern })
      .getOne();
  }

  findOneByTrimmedNameAndType(name: string, companyType: string): Promise<RubberCompany | null> {
    return this.repository
      .createQueryBuilder("c")
      .where("LOWER(TRIM(c.name)) = LOWER(TRIM(:name))", { name })
      .andWhere("c.company_type = :type", { type: companyType })
      .getOne();
  }

  findByCompoundOwner(isCompoundOwner: boolean): Promise<RubberCompany[]> {
    return this.repository.find({
      where: { isCompoundOwner },
    });
  }

  findByIds(ids: number[]): Promise<RubberCompany[]> {
    return this.repository.findByIds(ids);
  }

  findUnmappedToSage(): Promise<RubberCompany[]> {
    return this.repository.find({ where: { sageContactId: IsNull() } });
  }

  findAllOrderedByName(): Promise<RubberCompany[]> {
    return this.repository.find({ order: { name: "ASC" } });
  }

  findAllWithPricingTierOrderedByName(): Promise<RubberCompany[]> {
    return this.repository.find({
      relations: ["pricingTier"],
      order: { name: "ASC" },
    });
  }

  countUnmappedToSage(): Promise<number> {
    return this.repository.count({
      where: [{ sageContactId: IsNull() as unknown as number }],
    });
  }

  async updateById(id: number, updates: DeepPartial<RubberCompany>): Promise<void> {
    await this.repository.update(id, updates as QueryDeepPartialEntity<RubberCompany>);
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected || 0) > 0;
  }
}
