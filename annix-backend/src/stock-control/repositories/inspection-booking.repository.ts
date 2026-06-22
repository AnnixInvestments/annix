import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { InspectionBooking } from "../entities/inspection-booking.entity";

export abstract class InspectionBookingRepository extends TenantScopedRepository<InspectionBooking> {
  abstract withTransaction(context: TransactionContext): InspectionBookingRepository;
  abstract saveForCompany(companyId: number, entity: InspectionBooking): Promise<InspectionBooking>;
  abstract removeForCompany(companyId: number, entity: InspectionBooking): Promise<void>;
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
