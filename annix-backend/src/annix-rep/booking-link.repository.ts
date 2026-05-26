import { CrudRepository } from "../lib/persistence/crud-repository";
import { BookingLink } from "./entities/booking-link.entity";

export abstract class BookingLinkRepository extends CrudRepository<BookingLink> {
  abstract findByIdAndUser(id: number, userId: number): Promise<BookingLink | null>;
  abstract findByUser(userId: number): Promise<BookingLink[]>;
  abstract findActiveBySlug(slug: string): Promise<BookingLink | null>;
  abstract findActiveBySlugWithUser(slug: string): Promise<BookingLink | null>;
}
