import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  type DismissReasonMuteAction,
  OrbitDismissReason,
} from "../entities/orbit-dismiss-reason.entity";
import { OrbitDismissReasonRepository } from "../repositories/orbit-dismiss-reason.repository";

export interface CreateDismissReasonInput {
  code: string;
  label: string;
  muteAction: DismissReasonMuteAction | null;
  sortOrder: number;
  active: boolean;
}

export interface UpdateDismissReasonInput {
  label?: string;
  muteAction?: DismissReasonMuteAction | null;
  sortOrder?: number;
  active?: boolean;
}

const CODE_PATTERN = /^[a-z0-9_]+$/;

@Injectable()
export class OrbitDismissReasonService {
  constructor(private readonly repo: OrbitDismissReasonRepository) {}

  listAll(): Promise<OrbitDismissReason[]> {
    return this.repo.listAllSorted();
  }

  listActive(): Promise<OrbitDismissReason[]> {
    return this.repo.listActiveSorted();
  }

  findByCode(code: string): Promise<OrbitDismissReason | null> {
    return this.repo.findByCode(code);
  }

  async create(input: CreateDismissReasonInput): Promise<OrbitDismissReason> {
    const code = input.code.trim().toLowerCase();
    if (!CODE_PATTERN.test(code)) {
      throw new BadRequestException(
        "Code must contain only lowercase letters, numbers and underscores",
      );
    }
    const clash = await this.repo.findByCode(code);
    if (clash) {
      throw new BadRequestException("A dismiss reason with that code already exists");
    }
    return this.repo.create({
      code,
      label: input.label.trim(),
      muteAction: input.muteAction,
      sortOrder: input.sortOrder,
      active: input.active,
    });
  }

  async update(id: number, input: UpdateDismissReasonInput): Promise<OrbitDismissReason> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException("Dismiss reason not found");
    }
    if (input.label !== undefined) existing.label = input.label.trim();
    if (input.muteAction !== undefined) existing.muteAction = input.muteAction;
    if (input.sortOrder !== undefined) existing.sortOrder = input.sortOrder;
    if (input.active !== undefined) existing.active = input.active;
    return this.repo.save(existing);
  }

  async remove(id: number): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException("Dismiss reason not found");
    }
    await this.repo.deleteById(id);
  }
}
