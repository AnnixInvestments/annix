import { CrudRepository } from "../lib/persistence/crud-repository";
import type { ContactPage } from "./contact.service";
import type { ContactFilterDto } from "./dto/contact.dto";
import { Contact, ContactType } from "./entities/contact.entity";

export abstract class ContactRepository extends CrudRepository<Contact> {
  abstract search(companyId: number, filters: ContactFilterDto): Promise<ContactPage>;
  abstract findByCompanyAndId(companyId: number, id: number): Promise<Contact | null>;
  abstract findSuppliersByCompany(companyId: number): Promise<Contact[]>;
  abstract findCustomersByCompany(companyId: number): Promise<Contact[]>;
  abstract findByNameAndCompany(
    companyId: number,
    name: string,
    contactType?: ContactType,
  ): Promise<Contact | null>;
  abstract findByNameAndTypeOrBoth(
    companyId: number,
    name: string,
    contactType: ContactType,
  ): Promise<Contact | null>;
  abstract findAllByCompanyForFuzzyMatch(
    companyId: number,
    contactType?: ContactType,
  ): Promise<Contact[]>;
  abstract findUnmappedContacts(companyId: number, types: ContactType[]): Promise<Contact[]>;
}
