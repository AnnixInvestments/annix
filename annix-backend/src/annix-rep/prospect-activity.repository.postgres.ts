import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { ProspectActivity, ProspectActivityType } from "./entities/prospect-activity.entity";
import { ProspectActivityRepository } from "./prospect-activity.repository";

@Injectable()
export class PostgresProspectActivityRepository
  extends TypeOrmCrudRepository<ProspectActivity>
  implements ProspectActivityRepository
{
  constructor(@InjectRepository(ProspectActivity) repository: Repository<ProspectActivity>) {
    super(repository);
  }

  findByProspect(prospectId: number, limit: number): Promise<ProspectActivity[]> {
    return this.repository.find({
      where: { prospectId },
      order: { createdAt: "DESC" },
      take: limit,
      relations: ["user"],
    });
  }

  findByProspectAndType(
    prospectId: number,
    activityType: ProspectActivityType,
  ): Promise<ProspectActivity[]> {
    return this.repository.find({
      where: {
        prospectId,
        activityType,
      },
      relations: ["user"],
      order: { createdAt: "DESC" },
    });
  }

  findStatusChangesInRange(userId: number, from: Date, to: Date): Promise<ProspectActivity[]> {
    return this.repository.find({
      where: {
        userId,
        activityType: ProspectActivityType.STATUS_CHANGE,
        createdAt: Between(from, to),
      },
      relations: ["prospect"],
    });
  }
}
