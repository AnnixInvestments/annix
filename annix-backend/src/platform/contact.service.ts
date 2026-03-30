import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Contact, ContactType } from "./entities/contact.entity";

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  async findById(id: number): Promise<Contact> {
    const contact = await this.contactRepo.findOne({ where: { id } });

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    return contact;
  }

  async suppliers(companyId: number): Promise<Contact[]> {
    return this.contactRepo.find({
      where: [
        { companyId, contactType: ContactType.SUPPLIER },
        { companyId, contactType: ContactType.BOTH },
      ],
      order: { name: "ASC" },
    });
  }

  async customers(companyId: number): Promise<Contact[]> {
    return this.contactRepo.find({
      where: [
        { companyId, contactType: ContactType.CUSTOMER },
        { companyId, contactType: ContactType.BOTH },
      ],
      order: { name: "ASC" },
    });
  }

  async findByLegacyScSupplierId(scSupplierId: number): Promise<Contact | null> {
    return this.contactRepo.findOne({
      where: { legacyScSupplierId: scSupplierId },
    });
  }

  async findByLegacyRubberCompanyId(rubberCompanyId: number): Promise<Contact | null> {
    return this.contactRepo.findOne({
      where: { legacyRubberCompanyId: rubberCompanyId },
    });
  }

  async create(data: Partial<Contact>): Promise<Contact> {
    return this.contactRepo.save(this.contactRepo.create(data));
  }

  async update(id: number, data: Partial<Contact>): Promise<Contact> {
    const contact = await this.findById(id);
    Object.assign(contact, data);
    return this.contactRepo.save(contact);
  }
}
