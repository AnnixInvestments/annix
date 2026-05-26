import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { BookingLinkRepository } from "./booking-link.repository";
import { BookingLink } from "./entities/booking-link.entity";

@Injectable()
export class PostgresBookingLinkRepository
  extends TypeOrmCrudRepository<BookingLink>
  implements BookingLinkRepository
{
  constructor(@InjectRepository(BookingLink) repository: Repository<BookingLink>) {
    super(repository);
  }

  findByIdAndUser(id: number, userId: number): Promise<BookingLink | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  findByUser(userId: number): Promise<BookingLink[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  findActiveBySlug(slug: string): Promise<BookingLink | null> {
    return this.repository.findOne({ where: { slug, isActive: true } });
  }

  findActiveBySlugWithUser(slug: string): Promise<BookingLink | null> {
    return this.repository.findOne({
      where: { slug, isActive: true },
      relations: ["user"],
    });
  }
}
