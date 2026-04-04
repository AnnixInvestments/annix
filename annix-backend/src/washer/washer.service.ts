import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Bolt } from "../bolt/entities/bolt.entity";
import { findOneOrFail } from "../lib/entity-helpers";
import { CreateWasherDto } from "./dto/create-washer.dto";
import { UpdateWasherDto } from "./dto/update-washer.dto";
import { Washer } from "./entities/washer.entity";

@Injectable()
export class WasherService {
  constructor(
    @InjectRepository(Washer) private readonly washerRepo: Repository<Washer>,
    @InjectRepository(Bolt) private readonly boltRepo: Repository<Bolt>,
  ) {}

  async create(dto: CreateWasherDto): Promise<Washer> {
    const bolt = await findOneOrFail(this.boltRepo, { where: { id: dto.boltId } }, "Bolt");

    const washer = this.washerRepo.create({
      bolt,
      type: dto.type,
      material: dto.material || null,
      massKg: dto.massKg,
      odMm: dto.odMm || null,
      idMm: dto.idMm || null,
      thicknessMm: dto.thicknessMm || null,
    });

    return this.washerRepo.save(washer);
  }

  async findAll(filters?: {
    boltId?: number;
    type?: string;
    material?: string;
  }): Promise<Washer[]> {
    const query = this.washerRepo
      .createQueryBuilder("washer")
      .leftJoinAndSelect("washer.bolt", "bolt");

    if (filters?.boltId) {
      query.andWhere("bolt.id = :boltId", { boltId: filters.boltId });
    }
    if (filters?.type) {
      query.andWhere("washer.type = :type", { type: filters.type });
    }
    if (filters?.material) {
      query.andWhere("washer.material ILIKE :material", {
        material: `%${filters.material}%`,
      });
    }

    return query.orderBy("bolt.designation", "ASC").addOrderBy("washer.type", "ASC").getMany();
  }

  async findOne(id: number): Promise<Washer> {
    return findOneOrFail(this.washerRepo, { where: { id }, relations: ["bolt"] }, "Washer");
  }

  async findByBoltDesignation(designation: string, type?: string): Promise<Washer[]> {
    const query = this.washerRepo
      .createQueryBuilder("washer")
      .leftJoinAndSelect("washer.bolt", "bolt")
      .where("bolt.designation = :designation", { designation });

    if (type) {
      query.andWhere("washer.type = :type", { type });
    }

    return query.getMany();
  }

  async update(id: number, dto: UpdateWasherDto): Promise<Washer> {
    const washer = await this.findOne(id);

    if (dto.boltId) {
      const bolt = await findOneOrFail(this.boltRepo, { where: { id: dto.boltId } }, "Bolt");
      washer.bolt = bolt;
    }

    if (dto.type !== undefined) washer.type = dto.type;
    if (dto.material !== undefined) washer.material = dto.material || null;
    if (dto.massKg !== undefined) washer.massKg = dto.massKg;
    if (dto.odMm !== undefined) washer.odMm = dto.odMm || null;
    if (dto.idMm !== undefined) washer.idMm = dto.idMm || null;
    if (dto.thicknessMm !== undefined) washer.thicknessMm = dto.thicknessMm || null;

    return this.washerRepo.save(washer);
  }

  async remove(id: number): Promise<void> {
    const washer = await this.findOne(id);
    await this.washerRepo.remove(washer);
  }
}
