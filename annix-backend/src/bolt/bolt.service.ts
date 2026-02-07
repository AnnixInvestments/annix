import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateBoltDto } from "./dto/create-bolt.dto";
import { UpdateBoltDto } from "./dto/update-bolt.dto";
import { Bolt } from "./entities/bolt.entity";
import { PipeClampEntity } from "./entities/pipe-clamp.entity";
import { UBoltEntity } from "./entities/u-bolt.entity";

@Injectable()
export class BoltService {
  constructor(
    @InjectRepository(Bolt) private readonly boltRepo: Repository<Bolt>,
    @InjectRepository(UBoltEntity)
    private readonly uBoltRepo: Repository<UBoltEntity>,
    @InjectRepository(PipeClampEntity)
    private readonly pipeClampRepo: Repository<PipeClampEntity>,
  ) {}

  async create(createBoltDto: CreateBoltDto): Promise<Bolt> {
    const exists = await this.boltRepo.findOne({
      where: { designation: createBoltDto.designation },
    });
    if (exists) throw new BadRequestException(`Bolt ${createBoltDto.designation} already exists`);

    const bolt = this.boltRepo.create(createBoltDto);
    return this.boltRepo.save(bolt);
  }

  async findAll(filters?: {
    grade?: string;
    material?: string;
    headStyle?: string;
    size?: string;
  }): Promise<Bolt[]> {
    const query = this.boltRepo.createQueryBuilder("bolt");

    if (filters?.grade) {
      query.andWhere("bolt.grade = :grade", { grade: filters.grade });
    }
    if (filters?.material) {
      query.andWhere("bolt.material ILIKE :material", {
        material: `%${filters.material}%`,
      });
    }
    if (filters?.headStyle) {
      query.andWhere("bolt.head_style = :headStyle", {
        headStyle: filters.headStyle,
      });
    }
    if (filters?.size) {
      query.andWhere("bolt.designation LIKE :size", {
        size: `${filters.size}%`,
      });
    }

    return query.orderBy("bolt.designation", "ASC").getMany();
  }

  async findOne(id: number): Promise<Bolt> {
    const bolt = await this.boltRepo.findOne({ where: { id } });
    if (!bolt) throw new NotFoundException(`Bolt ${id} not found`);
    return bolt;
  }

  async update(id: number, dto: UpdateBoltDto): Promise<Bolt> {
    const bolt = await this.findOne(id);

    if (dto.designation) {
      const exists = await this.boltRepo.findOne({
        where: { designation: dto.designation },
      });
      if (exists && exists.id !== id)
        throw new BadRequestException(`Bolt ${dto.designation} already exists`);
      bolt.designation = dto.designation;
    }

    return this.boltRepo.save(bolt);
  }

  async remove(id: number): Promise<void> {
    const bolt = await this.findOne(id);
    await this.boltRepo.remove(bolt);
  }

  async uBolts(nbMm?: number): Promise<UBoltEntity[]> {
    const query = this.uBoltRepo.createQueryBuilder("ub");

    if (nbMm) {
      query.andWhere("ub.nb_mm = :nbMm", { nbMm });
    }

    return query.orderBy("ub.nb_mm", "ASC").getMany();
  }

  async uBolt(nbMm: number, threadSize?: string): Promise<UBoltEntity | null> {
    const query = this.uBoltRepo.createQueryBuilder("ub").where("ub.nb_mm = :nbMm", { nbMm });

    if (threadSize) {
      query.andWhere("ub.thread_size = :threadSize", { threadSize });
    }

    return query.getOne();
  }

  async pipeClamps(clampType?: string, nbMm?: number): Promise<PipeClampEntity[]> {
    const query = this.pipeClampRepo.createQueryBuilder("pc");

    if (clampType) {
      query.andWhere("pc.clamp_type = :clampType", { clampType });
    }
    if (nbMm) {
      query.andWhere("pc.nb_mm = :nbMm", { nbMm });
    }

    return query.orderBy("pc.clamp_type", "ASC").addOrderBy("pc.nb_mm", "ASC").getMany();
  }

  async pipeClamp(clampType: string, nbMm: number): Promise<PipeClampEntity | null> {
    return this.pipeClampRepo.findOne({
      where: { clampType, nbMm },
    });
  }

  async pipeClampTypes(): Promise<{ clampType: string; clampDescription: string }[]> {
    const results = await this.pipeClampRepo
      .createQueryBuilder("pc")
      .select("pc.clamp_type", "clampType")
      .addSelect("pc.clamp_description", "clampDescription")
      .distinct(true)
      .getRawMany();
    return results;
  }
}
