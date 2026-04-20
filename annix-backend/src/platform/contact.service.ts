import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type FindOptionsWhere, IsNull, Repository } from "typeorm";
import type { ContactFilterDto, CreateContactDto, UpdateContactDto } from "./dto/contact.dto";
import { Contact, ContactType } from "./entities/contact.entity";

export interface ContactPage {
  data: Contact[];
  total: number;
  page: number;
  limit: number;
}

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

  async findByCompanyAndId(companyId: number, id: number): Promise<Contact> {
    const contact = await this.contactRepo.findOne({ where: { id, companyId } });

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

  async search(companyId: number, filters: ContactFilterDto): Promise<ContactPage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.contactRepo
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

  async findByName(
    companyId: number,
    name: string,
    contactType?: ContactType,
  ): Promise<Contact | null> {
    const where: FindOptionsWhere<Contact> = { companyId, name };
    if (contactType) {
      where.contactType = contactType;
    }
    return this.contactRepo.findOne({ where });
  }

  async findOrCreateByName(
    companyId: number,
    name: string,
    contactType: ContactType,
    defaults?: Partial<Contact>,
  ): Promise<{ contact: Contact; created: boolean }> {
    const existing = await this.contactRepo.findOne({
      where: [
        { companyId, name, contactType },
        { companyId, name, contactType: ContactType.BOTH },
      ],
    });

    if (existing) {
      return { contact: existing, created: false };
    }

    const contact = await this.contactRepo.save(
      this.contactRepo.create({
        companyId,
        name,
        contactType,
        ...defaults,
      }),
    );

    return { contact, created: true };
  }

  async fuzzyMatchByName(
    companyId: number,
    name: string,
    contactType?: ContactType,
  ): Promise<Contact | null> {
    const candidates = contactType
      ? await this.contactRepo.find({
          where: [
            { companyId, contactType },
            { companyId, contactType: ContactType.BOTH },
          ],
        })
      : await this.contactRepo.find({ where: { companyId } });

    const normalizedInput = normalizeName(name);

    let bestMatch: Contact | null = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeName(candidate.name);

      if (normalizedInput === normalizedCandidate) {
        return candidate;
      }

      const score = similarityScore(normalizedInput, normalizedCandidate);
      if (score > bestScore && score >= 0.7) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    return bestMatch;
  }

  async create(data: CreateContactDto & { companyId: number }): Promise<Contact> {
    return this.contactRepo.save(this.contactRepo.create(data));
  }

  async update(companyId: number, id: number, data: UpdateContactDto): Promise<Contact> {
    const contact = await this.findByCompanyAndId(companyId, id);
    Object.assign(contact, data);
    return this.contactRepo.save(contact);
  }

  async remove(companyId: number, id: number): Promise<void> {
    const contact = await this.findByCompanyAndId(companyId, id);
    await this.contactRepo.remove(contact);
  }

  async updateSageMapping(
    id: number,
    sageContactId: number | null,
    sageContactType: string | null,
  ): Promise<Contact> {
    const contact = await this.findById(id);
    contact.sageContactId = sageContactId;
    contact.sageContactType = sageContactType;
    return this.contactRepo.save(contact);
  }

  async unmappedContacts(companyId: number, contactType?: ContactType): Promise<Contact[]> {
    const where: FindOptionsWhere<Contact>[] = [];
    const types = contactType
      ? [contactType, ContactType.BOTH]
      : [ContactType.SUPPLIER, ContactType.CUSTOMER, ContactType.BOTH];

    for (const t of types) {
      where.push({ companyId, contactType: t, sageContactId: IsNull() });
    }

    return this.contactRepo.find({ where, order: { name: "ASC" } });
  }
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(pty\)\s*ltd/gi, "")
    .replace(/\bpty\b/gi, "")
    .replace(/\bltd\b/gi, "")
    .replace(/\bcc\b/gi, "")
    .replace(/\binc\b/gi, "")
    .replace(/\bcorporation\b/gi, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function similarityScore(a: string, b: string): number {
  if (a === b) {
    return 1;
  }

  if (a.includes(b) || b.includes(a)) {
    return 0.85;
  }

  const wordsA = new Set(a.split(" ").filter(Boolean));
  const wordsB = new Set(b.split(" ").filter(Boolean));
  const intersection = new Set(Array.from(wordsA).filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);

  if (union.size === 0) {
    return 0;
  }

  return (intersection.size / union.size) * 0.8;
}
