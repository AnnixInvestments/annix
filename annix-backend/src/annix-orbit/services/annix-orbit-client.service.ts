import { Injectable, NotFoundException } from "@nestjs/common";
import {
  CreateAnnixOrbitClientDto,
  UpdateAnnixOrbitClientDto,
} from "../dto/annix-orbit-client.dto";
import {
  type AnnixOrbitClient,
  type AnnixOrbitClientStatus,
} from "../entities/annix-orbit-client.entity";
import { AnnixOrbitClientRepository } from "../repositories/annix-orbit-client.repository";

@Injectable()
export class AnnixOrbitClientService {
  constructor(private readonly clientRepo: AnnixOrbitClientRepository) {}

  findForCompany(companyId: number): Promise<AnnixOrbitClient[]> {
    return this.clientRepo.findByCompany(companyId);
  }

  async findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitClient> {
    const client = await this.clientRepo.findByIdForCompany(id, companyId);
    if (!client) {
      throw new NotFoundException("Client not found");
    }
    return client;
  }

  create(companyId: number, dto: CreateAnnixOrbitClientDto): Promise<AnnixOrbitClient> {
    return this.clientRepo.create({
      companyId,
      name: dto.name,
      industry: dto.industry ?? null,
      province: dto.province ?? null,
      city: dto.city ?? null,
      contactName: dto.contactName ?? null,
      contactEmail: dto.contactEmail ?? null,
      contactPhone: dto.contactPhone ?? null,
      feePercentage: dto.feePercentage ?? null,
      paymentTerms: dto.paymentTerms ?? null,
      status: (dto.status ?? "prospect") as AnnixOrbitClientStatus,
      notes: dto.notes ?? null,
    });
  }

  async update(
    id: number,
    companyId: number,
    dto: UpdateAnnixOrbitClientDto,
  ): Promise<AnnixOrbitClient> {
    const client = await this.findByIdForCompany(id, companyId);
    client.name = dto.name;
    client.industry = dto.industry ?? null;
    client.province = dto.province ?? null;
    client.city = dto.city ?? null;
    client.contactName = dto.contactName ?? null;
    client.contactEmail = dto.contactEmail ?? null;
    client.contactPhone = dto.contactPhone ?? null;
    client.feePercentage = dto.feePercentage ?? null;
    client.paymentTerms = dto.paymentTerms ?? null;
    client.status = (dto.status ?? "prospect") as AnnixOrbitClientStatus;
    client.notes = dto.notes ?? null;
    return this.clientRepo.save(client);
  }

  async remove(id: number, companyId: number): Promise<void> {
    const client = await this.findByIdForCompany(id, companyId);
    await this.clientRepo.remove(client);
  }
}
