import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SeekerLaunchReadinessSnapshot } from "../entities/seeker-launch-readiness-snapshot.entity";
import { SeekerLaunchReadinessSnapshotRepository } from "./seeker-launch-readiness-snapshot.repository";

@Injectable()
export class PostgresSeekerLaunchReadinessSnapshotRepository
  extends TypeOrmCrudRepository<SeekerLaunchReadinessSnapshot>
  implements SeekerLaunchReadinessSnapshotRepository
{
  constructor(
    @InjectRepository(SeekerLaunchReadinessSnapshot)
    repository: Repository<SeekerLaunchReadinessSnapshot>,
  ) {
    super(repository);
  }

  listNewestFirst(limit: number): Promise<SeekerLaunchReadinessSnapshot[]> {
    return this.repository.find({ order: { createdAt: "DESC" }, take: limit });
  }

  latest(): Promise<SeekerLaunchReadinessSnapshot | null> {
    return this.repository.findOne({ where: {}, order: { createdAt: "DESC" } });
  }

  findByDate(snapshotDate: string): Promise<SeekerLaunchReadinessSnapshot | null> {
    return this.repository.findOne({ where: { snapshotDate } });
  }
}
