import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, Not, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { InspectionBooking } from "../entities/inspection-booking.entity";
import { InspectionBookingRepository } from "./inspection-booking.repository";

@Injectable()
export class PostgresInspectionBookingRepository
  extends TypeOrmCrudRepository<InspectionBooking>
  implements InspectionBookingRepository
{
  constructor(@InjectRepository(InspectionBooking) repository: Repository<InspectionBooking>) {
    super(repository);
  }

  findForJobCard(companyId: number, jobCardId: number): Promise<InspectionBooking[]> {
    return this.repository.find({
      where: { companyId, jobCardId },
      order: { inspectionDate: "DESC", startTime: "DESC" },
    });
  }

  findForDateRange(
    companyId: number,
    startDate: string,
    endDate: string,
  ): Promise<InspectionBooking[]> {
    return this.repository.find({
      where: {
        companyId,
        inspectionDate: Between(startDate, endDate),
      },
      relations: ["jobCard"],
      order: { inspectionDate: "ASC", startTime: "ASC" },
    });
  }

  findActiveForDate(companyId: number, date: string): Promise<InspectionBooking[]> {
    return this.repository.find({
      where: {
        companyId,
        inspectionDate: date,
        status: Not("cancelled"),
      },
      order: { startTime: "ASC" },
    });
  }

  findActiveForDateUnordered(companyId: number, date: string): Promise<InspectionBooking[]> {
    return this.repository.find({
      where: {
        companyId,
        inspectionDate: date,
        status: Not("cancelled"),
      },
    });
  }

  findOneForCompany(bookingId: number, companyId: number): Promise<InspectionBooking | null> {
    return this.repository.findOne({
      where: { id: bookingId, companyId },
    });
  }

  findOneByResponseToken(token: string): Promise<InspectionBooking | null> {
    return this.repository.findOne({ where: { responseToken: token } });
  }
}
