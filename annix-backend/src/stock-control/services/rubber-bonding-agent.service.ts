import { RUBBER_BONDING_AGENTS, type RubberBondingAgentSeed } from "@annix/product-data/rubber";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  RubberBondingAgent,
  type RubberBondingCoverageBasis,
} from "../entities/rubber-bonding-agent.entity";
import { RubberBondingAgentRepository } from "../repositories/rubber-bonding-agent.repository";
import {
  computeRubberBondingAgentPricing,
  type RubberBondingAgentPricing,
} from "./rubber-bonding-agent-pricing";
import { RubberPriceListService } from "./rubber-price-list.service";

function normalizeCoverageBasis(value: string | null | undefined): RubberBondingCoverageBasis {
  if (value === "gram" || value === "none") {
    return value;
  }
  return "litre";
}

function normalizeMatchKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export interface RubberBondingAgentInput {
  supplier?: string | null;
  name: string;
  packSizeLitres?: number | null;
  pricePerTin?: number | null;
  pricePerLitre?: number | null;
  areaCoverPerLitre?: number | null;
  coverageBasis?: string | null;
  gramsPerM2?: number | null;
  active?: boolean;
  preferred?: boolean;
}

export interface RubberBondingAgentRow {
  agent: RubberBondingAgent;
  pricing: RubberBondingAgentPricing;
}

export interface RubberBondingAgentListResponse {
  consumableMarkup: number;
  agents: RubberBondingAgentRow[];
}

@Injectable()
export class RubberBondingAgentService {
  private readonly logger = new Logger(RubberBondingAgentService.name);

  constructor(
    private readonly agentRepo: RubberBondingAgentRepository,
    private readonly priceListService: RubberPriceListService,
  ) {}

  computeAgentPricing(
    agent: RubberBondingAgent,
    consumableMarkup: number,
  ): RubberBondingAgentPricing {
    return computeRubberBondingAgentPricing(agent, consumableMarkup);
  }

  async list(companyId: number): Promise<RubberBondingAgentListResponse> {
    const [agents, config] = await Promise.all([
      this.agentRepo.findAllForCompany(companyId),
      this.priceListService.configForCompany(companyId),
    ]);
    const consumableMarkup = config.consumableMarkup;
    const rows = agents.map((agent) => ({
      agent,
      pricing: this.computeAgentPricing(agent, consumableMarkup),
    }));
    return { consumableMarkup, agents: rows };
  }

  private toCreatePayload(companyId: number, input: RubberBondingAgentInput) {
    return {
      companyId,
      supplier: input.supplier ?? null,
      name: input.name,
      packSizeLitres: input.packSizeLitres ?? null,
      pricePerTin: input.pricePerTin ?? null,
      pricePerLitre: input.pricePerLitre ?? null,
      areaCoverPerLitre: input.areaCoverPerLitre ?? null,
      coverageBasis: normalizeCoverageBasis(input.coverageBasis),
      gramsPerM2: input.gramsPerM2 ?? null,
      active: input.active ?? true,
      preferred: input.preferred ?? false,
    };
  }

  async create(companyId: number, input: RubberBondingAgentInput): Promise<RubberBondingAgent> {
    return this.agentRepo.create(this.toCreatePayload(companyId, input));
  }

  async update(
    companyId: number,
    id: number,
    input: Partial<RubberBondingAgentInput>,
  ): Promise<RubberBondingAgent> {
    const existing = await this.agentRepo.findOneForCompany(companyId, id);
    if (!existing) {
      throw new NotFoundException(`Rubber bonding agent ${id} not found`);
    }
    const merged: RubberBondingAgent = {
      ...existing,
      ...input,
      id: existing.id,
      companyId,
    } as RubberBondingAgent;
    return this.agentRepo.save(merged);
  }

  async remove(companyId: number, id: number): Promise<void> {
    const existing = await this.agentRepo.findOneForCompany(companyId, id);
    if (!existing) {
      throw new NotFoundException(`Rubber bonding agent ${id} not found`);
    }
    await this.agentRepo.remove(existing);
  }

  private async createSequentially(
    companyId: number,
    inputs: RubberBondingAgentInput[],
  ): Promise<RubberBondingAgent[]> {
    return inputs.reduce<Promise<RubberBondingAgent[]>>(async (accumulator, input) => {
      const created = await accumulator;
      const agent = await this.agentRepo.create(this.toCreatePayload(companyId, input));
      return [...created, agent];
    }, Promise.resolve([]));
  }

  async addMany(companyId: number, inputs: RubberBondingAgentInput[]): Promise<number> {
    const created = await this.createSequentially(companyId, inputs);
    return created.length;
  }

  async replaceSupplier(
    companyId: number,
    supplier: string,
    inputs: RubberBondingAgentInput[],
  ): Promise<number> {
    const existing = await this.agentRepo.findAllForCompany(companyId);
    const toRemove = existing.filter((agent) => agent.supplier === supplier);
    await Promise.all(toRemove.map((agent) => this.agentRepo.remove(agent)));
    return this.addMany(companyId, inputs);
  }

  async updateByName(
    companyId: number,
    supplier: string,
    inputs: RubberBondingAgentInput[],
  ): Promise<{ updated: number; created: number }> {
    const existing = await this.agentRepo.findAllForCompany(companyId);
    const byName = new Map(existing.map((agent) => [normalizeMatchKey(agent.name), agent]));
    const supplierName = supplier.trim() || null;
    const matched = inputs.filter((input) => byName.has(normalizeMatchKey(input.name)));
    const unmatched = inputs
      .filter((input) => !byName.has(normalizeMatchKey(input.name)))
      .map((input) => ({ ...input, supplier: supplierName }));
    await matched.reduce<Promise<void>>(async (previous, input) => {
      await previous;
      const match = byName.get(normalizeMatchKey(input.name));
      if (!match) {
        return;
      }
      await this.agentRepo.save({
        ...match,
        supplier: supplierName ?? match.supplier,
        packSizeLitres: input.packSizeLitres ?? match.packSizeLitres,
        pricePerTin: input.pricePerTin ?? match.pricePerTin,
        pricePerLitre: input.pricePerLitre ?? null,
      });
    }, Promise.resolve());
    await this.createSequentially(companyId, unmatched);
    return { updated: matched.length, created: unmatched.length };
  }

  private seedToInput(seed: RubberBondingAgentSeed): RubberBondingAgentInput {
    return {
      supplier: null,
      name: seed.name,
      packSizeLitres: seed.packSizeLitres,
      pricePerTin: seed.pricePerTin,
      pricePerLitre: seed.pricePerLitre,
      areaCoverPerLitre: seed.areaCoverPerLitre,
      active: true,
      preferred: false,
    };
  }

  async seedFromProductData(companyId: number): Promise<{ seeded: number }> {
    const existing = await this.agentRepo.findAllForCompany(companyId);
    if (existing.length > 0) {
      return { seeded: 0 };
    }
    const created = await this.createSequentially(
      companyId,
      RUBBER_BONDING_AGENTS.map((seed) => this.seedToInput(seed)),
    );
    this.logger.log(`Seeded ${created.length} rubber bonding agent(s) from product data`);
    return { seeded: created.length };
  }
}
