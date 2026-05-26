import { CrudRepository } from "../../lib/persistence/crud-repository";
import { InspectionBooking } from "../entities/inspection-booking.entity";

export abstract class InspectionBookingRepository extends CrudRepository<InspectionBooking> {
  abstract findForJobCard(companyId: number, jobCardId: number): Promise<InspectionBooking[]>;
  abstract findForDateRange(
    companyId: number,
    startDate: string,
    endDate: string,
  ): Promise<InspectionBooking[]>;
  abstract findActiveForDate(companyId: number, date: string): Promise<InspectionBooking[]>;
  abstract findActiveForDateUnordered(
    companyId: number,
    date: string,
  ): Promise<InspectionBooking[]>;
  abstract findOneForCompany(
    bookingId: number,
    companyId: number,
  ): Promise<InspectionBooking | null>;
  abstract findOneByResponseToken(token: string): Promise<InspectionBooking | null>;
}
