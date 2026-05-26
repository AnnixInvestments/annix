import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../lib/datetime";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { BroadcastPage, BroadcastRepository } from "./broadcast.repository";
import { BroadcastFilterDto } from "./dto";
import { Broadcast } from "./entities/broadcast.entity";

@Injectable()
export class PostgresBroadcastRepository
  extends TypeOrmCrudRepository<Broadcast>
  implements BroadcastRepository
{
  constructor(@InjectRepository(Broadcast) repository: Repository<Broadcast>) {
    super(repository);
  }

  async findPageForIds(
    ids: number[],
    filters: BroadcastFilterDto,
    skip: number,
    limit: number,
  ): Promise<BroadcastPage<Broadcast>> {
    const queryBuilder = this.repository
      .createQueryBuilder("b")
      .leftJoinAndSelect("b.sentBy", "sentBy")
      .where("b.id IN (:...ids)", { ids });

    this.applyFilters(queryBuilder, filters);
    queryBuilder.orderBy("b.createdAt", "DESC").skip(skip).take(limit);

    const [broadcasts, total] = await queryBuilder.getManyAndCount();
    return { broadcasts, total };
  }

  async findPage(
    filters: BroadcastFilterDto,
    skip: number,
    limit: number,
  ): Promise<BroadcastPage<Broadcast>> {
    const queryBuilder = this.repository
      .createQueryBuilder("b")
      .leftJoinAndSelect("b.sentBy", "sentBy");

    this.applyFilters(queryBuilder, filters);
    queryBuilder.orderBy("b.createdAt", "DESC").skip(skip).take(limit);

    const [broadcasts, total] = await queryBuilder.getManyAndCount();
    return { broadcasts, total };
  }

  private applyFilters(
    queryBuilder: ReturnType<typeof this.repository.createQueryBuilder>,
    filters: BroadcastFilterDto,
  ): void {
    if (!filters.includeExpired) {
      queryBuilder.andWhere("(b.expiresAt IS NULL OR b.expiresAt > :now)", {
        now: now().toJSDate(),
      });
    }
    if (filters.priority) {
      queryBuilder.andWhere("b.priority = :priority", { priority: filters.priority });
    }
  }
}
