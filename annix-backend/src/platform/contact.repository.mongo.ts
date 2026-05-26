import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ContactRepository } from "./contact.repository";
import type { ContactPage } from "./contact.service";
import type { ContactFilterDto } from "./dto/contact.dto";
import { Contact, ContactType } from "./entities/contact.entity";

@Injectable()
export class MongoContactRepository
  extends MongoCrudRepository<Contact>
  implements ContactRepository
{
  constructor(@InjectModel("Contact") model: Model<Contact>) {
    super(model);
  }

  async search(companyId: number, filters: ContactFilterDto): Promise<ContactPage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { companyId };

    if (filters.contactType) {
      if (filters.contactType === ContactType.SUPPLIER) {
        query.contactType = { $in: [ContactType.SUPPLIER, ContactType.BOTH] };
      } else if (filters.contactType === ContactType.CUSTOMER) {
        query.contactType = { $in: [ContactType.CUSTOMER, ContactType.BOTH] };
      } else {
        query.contactType = filters.contactType;
      }
    }

    if (filters.search) {
      const re = new RegExp(filters.search, "i");
      query.$or = [{ name: re }, { email: re }, { contactPerson: re }, { code: re }];
    }

    if (filters.hasSageMapping === true) {
      query.sageContactId = { $ne: null };
    } else if (filters.hasSageMapping === false) {
      query.sageContactId = null;
    }

    const [documents, total] = await Promise.all([
      this.documents.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean().exec(),
      this.documents.countDocuments(query).exec(),
    ]);

    return { data: this.toDomainList(documents), total, page, limit };
  }

  async findByCompanyAndId(companyId: number, id: number): Promise<Contact | null> {
    const document = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(document);
  }

  async findSuppliersByCompany(companyId: number): Promise<Contact[]> {
    const documents = await this.documents
      .find({ companyId, contactType: { $in: [ContactType.SUPPLIER, ContactType.BOTH] } })
      .sort({ name: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findCustomersByCompany(companyId: number): Promise<Contact[]> {
    const documents = await this.documents
      .find({ companyId, contactType: { $in: [ContactType.CUSTOMER, ContactType.BOTH] } })
      .sort({ name: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByNameAndCompany(
    companyId: number,
    name: string,
    contactType?: ContactType,
  ): Promise<Contact | null> {
    const query: Record<string, unknown> = { companyId, name };
    if (contactType) {
      query.contactType = contactType;
    }
    const document = await this.documents.findOne(query).lean().exec();
    return this.toDomain(document);
  }

  async findByNameAndTypeOrBoth(
    companyId: number,
    name: string,
    contactType: ContactType,
  ): Promise<Contact | null> {
    const document = await this.documents
      .findOne({
        companyId,
        name,
        contactType: { $in: [contactType, ContactType.BOTH] },
      })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findAllByCompanyForFuzzyMatch(
    companyId: number,
    contactType?: ContactType,
  ): Promise<Contact[]> {
    const query: Record<string, unknown> = { companyId };
    if (contactType) {
      query.contactType = { $in: [contactType, ContactType.BOTH] };
    }
    const documents = await this.documents.find(query).lean().exec();
    return this.toDomainList(documents);
  }

  async findUnmappedContacts(companyId: number, types: ContactType[]): Promise<Contact[]> {
    const documents = await this.documents
      .find({ companyId, contactType: { $in: types }, sageContactId: null })
      .sort({ name: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
