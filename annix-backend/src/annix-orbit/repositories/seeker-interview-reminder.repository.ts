import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SeekerInterviewReminder } from "../entities/seeker-interview-reminder.entity";

export abstract class SeekerInterviewReminderRepository extends CrudRepository<SeekerInterviewReminder> {
  abstract findSent(
    source: string,
    sourceId: number,
    offset: string,
  ): Promise<SeekerInterviewReminder | null>;
}
