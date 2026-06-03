import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SeekerInterviewReminder } from "../entities/seeker-interview-reminder.entity";
import { SeekerInterviewReminderRepository } from "./seeker-interview-reminder.repository";

@Injectable()
export class PostgresSeekerInterviewReminderRepository
  extends TypeOrmCrudRepository<SeekerInterviewReminder>
  implements SeekerInterviewReminderRepository
{
  constructor(
    @InjectRepository(SeekerInterviewReminder) repository: Repository<SeekerInterviewReminder>,
  ) {
    super(repository);
  }

  findSent(
    source: string,
    sourceId: number,
    offset: string,
  ): Promise<SeekerInterviewReminder | null> {
    return this.repository.findOne({ where: { source, sourceId, offset } });
  }
}
