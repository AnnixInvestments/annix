import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrbitCredentialType } from "../entities/orbit-credential-type.entity";
import { OrbitCredentialTypeRepository } from "../repositories/orbit-credential-type.repository";

export interface CreateCredentialTypeInput {
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

export interface UpdateCredentialTypeInput {
  label?: string;
  description?: string | null;
  sortOrder?: number;
  active?: boolean;
}

const CODE_PATTERN = /^[a-z0-9_]+$/;

@Injectable()
export class OrbitCredentialTypeService {
  constructor(private readonly repo: OrbitCredentialTypeRepository) {}

  listAll(): Promise<OrbitCredentialType[]> {
    return this.repo.listAllSorted();
  }

  listActive(): Promise<OrbitCredentialType[]> {
    return this.repo.listActiveSorted();
  }

  async create(input: CreateCredentialTypeInput): Promise<OrbitCredentialType> {
    const code = input.code.trim().toLowerCase();
    if (!CODE_PATTERN.test(code)) {
      throw new BadRequestException(
        "Code must contain only lowercase letters, numbers and underscores",
      );
    }
    const clash = await this.repo.findByCode(code);
    if (clash) {
      throw new BadRequestException("A credential type with that code already exists");
    }
    return this.repo.create({
      code,
      label: input.label.trim(),
      description: input.description ? input.description.trim() : null,
      sortOrder: input.sortOrder,
      active: input.active,
    });
  }

  async update(id: number, input: UpdateCredentialTypeInput): Promise<OrbitCredentialType> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException("Credential type not found");
    }
    if (input.label !== undefined) existing.label = input.label.trim();
    if (input.description !== undefined) {
      existing.description = input.description ? input.description.trim() : null;
    }
    if (input.sortOrder !== undefined) existing.sortOrder = input.sortOrder;
    if (input.active !== undefined) existing.active = input.active;
    return this.repo.save(existing);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException("Credential type not found");
    }
    await this.repo.deleteById(id);
  }
}
