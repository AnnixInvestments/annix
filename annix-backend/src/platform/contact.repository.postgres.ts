import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type FindOptionsWhere, IsNull, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { ContactRepository } from "./contact.repository";
import type { ContactPage } from "./contact.service";
import type { ContactFilterDto } from "./dto/contact.dto";
import { Contact, ContactType } from "./entities/contact.entity";

@Injectable()
export class PostgresContactRepository
  extends TypeOrmCrudRepository<Contact>
  implements ContactRepository
{
  constructor(@InjectRepository(Contact) repository: Repository<Contact>) {
    super(repository);
  }

  async search(companyId: number, filters: ContactFilterDto): Promise<ContactPage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.repository
      .createQueryBuilder("contact")
      .where("contact.company_id = :companyId", { companyId });

    if (filters.contactType) {
      if (filters.contactType === ContactType.SUPPLIER) {
        qb.andWhere("contact.contact_type IN (:...types)", {
          types: [ContactType.SUPPLIER, ContactType.BOTH],
        });
      } else if (filters.contactType === ContactType.CUSTOMER) {
        qb.andWhere("contact.contact_type IN (:...types)", {
          types: [ContactType.CUSTOMER, ContactType.BOTH],
        });
      } else {
        qb.andWhere("contact.contact_type = :type", { type: filters.contactType });
      }
    }

    if (filters.search) {
      qb.andWhere(
        "(contact.name ILIKE :search OR contact.email ILIKE :search OR contact.contact_person ILIKE :search OR contact.code ILIKE :search)",
        { search: `%${filters.search}%` },
      );
    }

    if (filters.hasSageMapping === true) {
      qb.andWhere("contact.sage_contact_id IS NOT NULL");
    } else if (filters.hasSageMapping === false) {
      qb.andWhere("contact.sage_contact_id IS NULL");
    }

    qb.orderBy("contact.name", "ASC");

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return { data, total, page, limit };
  }

  findByCompanyAndId(companyId: number, id: number): Promise<Contact | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findSuppliersByCompany(companyId: number): Promise<Contact[]> {
    return this.repository.find({
      where: [
        { companyId, contactType: ContactType.SUPPLIER },
        { companyId, contactType: ContactType.BOTH },
      ],
      order: { name: "ASC" },
    });
  }

  findCustomersByCompany(companyId: number): Promise<Contact[]> {
    return this.repository.find({
      where: [
        { companyId, contactType: ContactType.CUSTOMER },
        { companyId, contactType: ContactType.BOTH },
      ],
      order: { name: "ASC" },
    });
  }

  findByNameAndCompany(
    companyId: number,
    name: string,
    contactType?: ContactType,
  ): Promise<Contact | null> {
    const where: FindOptionsWhere<Contact> = { companyId, name };
    if (contactType) {
      where.contactType = contactType;
    }
    return this.repository.findOne({ where });
  }

  findByNameAndTypeOrBoth(
    companyId: number,
    name: string,
    contactType: ContactType,
  ): Promise<Contact | null> {
    return this.repository.findOne({
      where: [
        { companyId, name, contactType },
        { companyId, name, contactType: ContactType.BOTH },
      ],
    });
  }

  findAllByCompanyForFuzzyMatch(companyId: number, contactType?: ContactType): Promise<Contact[]> {
    if (contactType) {
      return this.repository.find({
        where: [
          { companyId, contactType },
          { companyId, contactType: ContactType.BOTH },
        ],
      });
    }
    return this.repository.find({ where: { companyId } });
  }

  findUnmappedContacts(companyId: number, types: ContactType[]): Promise<Contact[]> {
    const where = types.map((t) => ({
      companyId,
      contactType: t,
      sageContactId: IsNull(),
    }));
    return this.repository.find({ where, order: { name: "ASC" } });
  }
}
