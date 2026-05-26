import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { DeliveryNoteRepository } from "./delivery-note.repository";
import type { DeliveryNotePage } from "./delivery-note.service";
import type { DeliveryNoteFilterDto } from "./dto/delivery-note.dto";
import { PlatformDeliveryNote } from "./entities/delivery-note.entity";

@Injectable()
export class PostgresDeliveryNoteRepository
  extends TypeOrmCrudRepository<PlatformDeliveryNote>
  implements DeliveryNoteRepository
{
  constructor(
    @InjectRepository(PlatformDeliveryNote) repository: Repository<PlatformDeliveryNote>,
  ) {
    super(repository);
  }

  async search(companyId: number, filters: DeliveryNoteFilterDto): Promise<DeliveryNotePage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.repository
      .createQueryBuilder("dn")
      .leftJoinAndSelect("dn.supplierContact", "supplier")
      .where("dn.company_id = :companyId", { companyId })
      .andWhere("dn.version_status = :versionStatus", { versionStatus: "ACTIVE" });

    if (filters.sourceModule) {
      qb.andWhere("dn.source_module = :sourceModule", { sourceModule: filters.sourceModule });
    }

    if (filters.deliveryNoteType) {
      qb.andWhere("dn.delivery_note_type = :dnType", { dnType: filters.deliveryNoteType });
    }

    if (filters.status) {
      qb.andWhere("dn.status = :status", { status: filters.status });
    }

    if (filters.supplierContactId) {
      qb.andWhere("dn.supplier_contact_id = :supplierId", {
        supplierId: filters.supplierContactId,
      });
    }

    if (filters.search) {
      qb.andWhere(
        "(dn.delivery_number ILIKE :search OR dn.supplier_name ILIKE :search OR dn.customer_reference ILIKE :search)",
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy("dn.created_at", "DESC");

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return { data, total, page, limit };
  }

  findByCompanyAndId(
    companyId: number,
    id: number,
    relations: string[] = [],
  ): Promise<PlatformDeliveryNote | null> {
    return this.repository.findOne({
      where: { id, companyId },
      ...(relations.length > 0 ? { relations } : {}),
    });
  }

  findByLegacyScId(id: number): Promise<PlatformDeliveryNote | null> {
    return this.repository.findOne({ where: { legacyScDeliveryNoteId: id } });
  }

  findByLegacyRubberId(id: number): Promise<PlatformDeliveryNote | null> {
    return this.repository.findOne({ where: { legacyRubberDeliveryNoteId: id } });
  }
}
