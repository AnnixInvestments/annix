import { Injectable, NotFoundException } from "@nestjs/common";
import { ContactRepository } from "./contact.repository";
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
  constructor(private readonly contactRepo: ContactRepository) {}

  async findById(id: number): Promise<Contact> {
    const contact = await this.contactRepo.findById(id);

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    return contact;
  }

  async findByCompanyAndId(companyId: number, id: number): Promise<Contact> {
    const contact = await this.contactRepo.findByCompanyAndId(companyId, id);

    if (!contact) {
      throw new NotFoundException(`Contact ${id} not found`);
    }

    return contact;
  }

  suppliers(companyId: number): Promise<Contact[]> {
    return this.contactRepo.findSuppliersByCompany(companyId);
  }

  customers(companyId: number): Promise<Contact[]> {
    return this.contactRepo.findCustomersByCompany(companyId);
  }

  search(companyId: number, filters: ContactFilterDto): Promise<ContactPage> {
    return this.contactRepo.search(companyId, filters);
  }

  findByName(companyId: number, name: string, contactType?: ContactType): Promise<Contact | null> {
    return this.contactRepo.findByNameAndCompany(companyId, name, contactType);
  }

  async findOrCreateByName(
    companyId: number,
    name: string,
    contactType: ContactType,
    defaults?: Partial<Contact>,
  ): Promise<{ contact: Contact; created: boolean }> {
    const existing = await this.contactRepo.findByNameAndTypeOrBoth(companyId, name, contactType);

    if (existing) {
      return { contact: existing, created: false };
    }

    const contact = await this.contactRepo.create({
      companyId,
      name,
      contactType,
      ...defaults,
    });

    return { contact, created: true };
  }

  async fuzzyMatchByName(
    companyId: number,
    name: string,
    contactType?: ContactType,
  ): Promise<Contact | null> {
    const candidates = await this.contactRepo.findAllByCompanyForFuzzyMatch(companyId, contactType);

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
    return this.contactRepo.create(data);
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
    companyId: number,
    id: number,
    sageContactId: number | null,
    sageContactType: string | null,
  ): Promise<Contact> {
    const contact = await this.findByCompanyAndId(companyId, id);
    contact.sageContactId = sageContactId;
    contact.sageContactType = sageContactType;
    return this.contactRepo.save(contact);
  }

  async unmappedContacts(companyId: number, contactType?: ContactType): Promise<Contact[]> {
    const types = contactType
      ? [contactType, ContactType.BOTH]
      : [ContactType.SUPPLIER, ContactType.CUSTOMER, ContactType.BOTH];

    return this.contactRepo.findUnmappedContacts(companyId, types);
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
