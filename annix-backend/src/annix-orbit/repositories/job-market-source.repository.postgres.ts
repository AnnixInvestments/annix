import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobMarketSource, JobSourceProvider } from "../entities/job-market-source.entity";
import { JobMarketSourceRepository } from "./job-market-source.repository";

@Injectable()
export class PostgresJobMarketSourceRepository
  extends TypeOrmCrudRepository<JobMarketSource>
  implements JobMarketSourceRepository
{
  constructor(@InjectRepository(JobMarketSource) repository: Repository<JobMarketSource>) {
    super(repository);
  }

  findEnabled(): Promise<JobMarketSource[]> {
    return this.repository.find({ where: { enabled: true } });
  }

  findPlatformGlobal(): Promise<JobMarketSource[]> {
    return this.repository.find({ where: { companyId: IsNull() } });
  }

  findForCompany(companyId: number): Promise<JobMarketSource[]> {
    return this.repository.find({ where: { companyId }, order: { createdAt: "DESC" } });
  }

  findByIdForCompany(id: number, companyId: number): Promise<JobMarketSource | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findByIds(ids: number[]): Promise<JobMarketSource[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.repository.findByIds(ids);
  }

  async sourceIdsForCompany(companyId: number): Promise<number[]> {
    const sources = await this.repository.find({
      where: { companyId },
      select: ["id"],
    });
    return sources.map((s) => s.id);
  }

  findEnabledByProvider(provider: JobSourceProvider): Promise<JobMarketSource | null> {
    return this.repository.findOne({ where: { provider, enabled: true } });
  }
}
