import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { SaMine } from "./entities/sa-mine.entity";
import { SaMineFilters, SaMineRepository } from "./sa-mine.repository";

@Injectable()
export class PostgresSaMineRepository
  extends TypeOrmCrudRepository<SaMine>
  implements SaMineRepository
{
  constructor(@InjectRepository(SaMine) repository: Repository<SaMine>) {
    super(repository);
  }

  async findFiltered(filters: SaMineFilters): Promise<SaMine[]> {
    const query = this.repository
      .createQueryBuilder("mine")
      .leftJoinAndSelect("mine.commodity", "commodity")
      .orderBy("mine.mineName", "ASC");

    if (filters.commodityId) {
      query.andWhere("mine.commodityId = :commodityId", { commodityId: filters.commodityId });
    }

    if (filters.province) {
      query.andWhere("mine.province = :province", { province: filters.province });
    }

    if (filters.status) {
      query.andWhere("mine.operationalStatus = :status", { status: filters.status });
    }

    return query.getMany();
  }

  findByIdWithCommodity(id: number): Promise<SaMine | null> {
    return this.repository.findOne({ where: { id }, relations: ["commodity"] });
  }

  async distinctProvinces(): Promise<string[]> {
    const result = await this.repository
      .createQueryBuilder("mine")
      .select("DISTINCT mine.province", "province")
      .orderBy("mine.province", "ASC")
      .getRawMany();
    return result.map((r: { province: string }) => r.province);
  }

  async createMine(data: Partial<SaMine>): Promise<SaMine> {
    const mine = this.repository.create(data as SaMine);
    return this.repository.save(mine);
  }

  findCreatedMine(id: number): Promise<SaMine> {
    return this.repository.findOne({ where: { id }, relations: ["commodity"] }) as Promise<SaMine>;
  }

  findByIds(ids: number[]): Promise<SaMine[]> {
    return this.repository.findBy({ id: In(ids) });
  }

  searchByName(query: string | null): Promise<SaMine[]> {
    const where = query
      ? [{ mineName: ILike(`%${query}%`) }, { operatingCompany: ILike(`%${query}%`) }]
      : undefined;
    return this.repository.find({
      where,
      order: { mineName: "ASC" },
      take: 50,
    });
  }

  findByNameAndCompany(mineName: string, operatingCompany: string): Promise<SaMine | null> {
    return this.repository.findOne({
      where: { mineName: ILike(mineName), operatingCompany: ILike(operatingCompany) },
    });
  }
}
