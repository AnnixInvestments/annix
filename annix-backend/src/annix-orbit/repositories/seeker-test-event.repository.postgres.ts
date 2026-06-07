import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThanOrEqual, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SeekerTestEvent } from "../entities/seeker-test-event.entity";
import { SeekerTestEventRepository } from "./seeker-test-event.repository";

@Injectable()
export class PostgresSeekerTestEventRepository
  extends TypeOrmCrudRepository<SeekerTestEvent>
  implements SeekerTestEventRepository
{
  constructor(@InjectRepository(SeekerTestEvent) repository: Repository<SeekerTestEvent>) {
    super(repository);
  }

  recentFailures(limit: number): Promise<SeekerTestEvent[]> {
    return this.repository.find({ where: { ok: false }, order: { ts: "DESC" }, take: limit });
  }

  eventsSince(since: Date): Promise<SeekerTestEvent[]> {
    return this.repository.find({ where: { ts: MoreThanOrEqual(since) } });
  }

  countByEventNameSince(eventName: string, since: Date): Promise<number> {
    return this.repository.count({ where: { eventName, ts: MoreThanOrEqual(since) } });
  }
}
