import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { InterviewSlot } from "../entities/interview-slot.entity";
import { InterviewSlotRepository } from "./interview-slot.repository";

@Injectable()
export class PostgresInterviewSlotRepository
  extends TypeOrmCrudRepository<InterviewSlot>
  implements InterviewSlotRepository
{
  constructor(@InjectRepository(InterviewSlot) repository: Repository<InterviewSlot>) {
    super(repository);
  }

  listForJob(companyId: number, jobPostingId: number): Promise<InterviewSlot[]> {
    return this.repository.find({
      where: { companyId, jobPostingId },
      relations: ["bookings", "bookings.candidate"],
      order: { startsAt: "ASC" },
    });
  }

  listForCompanyBetween(companyId: number, fromDate: Date, toDate: Date): Promise<InterviewSlot[]> {
    return this.repository.find({
      where: { companyId, startsAt: Between(fromDate, toDate) },
      relations: ["jobPosting", "bookings", "bookings.candidate"],
      order: { startsAt: "ASC" },
    });
  }

  findByIdForCompanyWithBookings(slotId: number, companyId: number): Promise<InterviewSlot | null> {
    return this.repository.findOne({
      where: { id: slotId, companyId },
      relations: ["bookings"],
    });
  }

  listOpenForJob(jobPostingId: number): Promise<InterviewSlot[]> {
    return this.repository.find({
      where: { jobPostingId, isCancelled: false },
      relations: ["bookings"],
      order: { startsAt: "ASC" },
    });
  }

  async deleteById(slotId: number): Promise<void> {
    await this.repository.delete({ id: slotId });
  }
}
