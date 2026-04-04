import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { findOneOrFail } from "../lib/entity-helpers";
import { NutMass } from "../nut-mass/entities/nut-mass.entity";
import { Washer } from "../washer/entities/washer.entity";
import { CreateBoltDto } from "./dto/create-bolt.dto";
import { UpdateBoltDto } from "./dto/update-bolt.dto";
import { Bolt } from "./entities/bolt.entity";
import { PipeClampEntity } from "./entities/pipe-clamp.entity";
import { ThreadedInsert } from "./entities/threaded-insert.entity";
import { UBoltEntity } from "./entities/u-bolt.entity";

@Injectable()
export class BoltService {
  constructor(
    @InjectRepository(Bolt) private readonly boltRepo: Repository<Bolt>,
    @InjectRepository(UBoltEntity)
    private readonly uBoltRepo: Repository<UBoltEntity>,
    @InjectRepository(PipeClampEntity)
    private readonly pipeClampRepo: Repository<PipeClampEntity>,
    @InjectRepository(NutMass)
    private readonly nutMassRepo: Repository<NutMass>,
    @InjectRepository(Washer)
    private readonly washerRepo: Repository<Washer>,
    @InjectRepository(ThreadedInsert)
    private readonly threadedInsertRepo: Repository<ThreadedInsert>,
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
    return findOneOrFail(this.boltRepo, { where: { id } }, "Bolt");
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

  async fastenerTypesGrouped(): Promise<
    Array<{ category: string; types: Array<{ type: string; count: number }> }>
  > {
    const boltCategories = await this.boltRepo
      .createQueryBuilder("b")
      .select("b.category", "type")
      .addSelect("COUNT(*)", "count")
      .where("b.category IS NOT NULL")
      .groupBy("b.category")
      .getRawMany();

    const nutTypes = await this.nutMassRepo
      .createQueryBuilder("n")
      .select("n.type", "type")
      .addSelect("COUNT(*)", "count")
      .where("n.type IS NOT NULL")
      .groupBy("n.type")
      .getRawMany();

    const washerTypes = await this.washerRepo
      .createQueryBuilder("w")
      .select("w.type", "type")
      .addSelect("COUNT(*)", "count")
      .where("w.type IS NOT NULL")
      .groupBy("w.type")
      .getRawMany();

    const insertTypes = await this.threadedInsertRepo
      .createQueryBuilder("i")
      .select("i.insert_type", "type")
      .addSelect("COUNT(*)", "count")
      .groupBy("i.insert_type")
      .getRawMany();

    return [
      { category: "bolt", types: boltCategories },
      { category: "nut", types: nutTypes },
      { category: "washer", types: washerTypes },
      { category: "insert", types: insertTypes },
    ];
  }

  async fastenerSizesForType(category: string, type: string): Promise<Array<{ size: string }>> {
    if (category === "bolt") {
      const results = await this.boltRepo
        .createQueryBuilder("b")
        .select("DISTINCT b.designation", "size")
        .where("b.category = :type", { type })
        .orderBy("b.designation", "ASC")
        .getRawMany();
      return results;
    } else if (category === "nut") {
      const results = await this.nutMassRepo
        .createQueryBuilder("n")
        .innerJoin("n.bolt", "b")
        .select("DISTINCT b.designation", "size")
        .where("n.type = :type", { type })
        .orderBy("b.designation", "ASC")
        .getRawMany();
      return results;
    } else if (category === "washer") {
      const results = await this.washerRepo
        .createQueryBuilder("w")
        .innerJoin("w.bolt", "b")
        .select("DISTINCT b.designation", "size")
        .where("w.type = :type", { type })
        .orderBy("b.designation", "ASC")
        .getRawMany();
      return results;
    } else if (category === "insert") {
      const results = await this.threadedInsertRepo
        .createQueryBuilder("i")
        .select("DISTINCT i.designation", "size")
        .where("i.insert_type = :type", { type })
        .orderBy("i.designation", "ASC")
        .getRawMany();
      return results;
    }
    return [];
  }

  async fastenerGradesForTypeAndSize(
    category: string,
    type: string,
    size: string,
  ): Promise<Array<{ grade: string | null; material: string | null }>> {
    if (category === "bolt") {
      const results = await this.boltRepo
        .createQueryBuilder("b")
        .select("DISTINCT b.grade", "grade")
        .addSelect("b.material", "material")
        .where("b.category = :type AND b.designation LIKE :size", {
          type,
          size: `${size}%`,
        })
        .getRawMany();
      return results;
    } else if (category === "nut") {
      const results = await this.nutMassRepo
        .createQueryBuilder("n")
        .innerJoin("n.bolt", "b")
        .select("DISTINCT n.grade", "grade")
        .addSelect("'Carbon Steel'", "material")
        .where("n.type = :type AND b.designation = :size", { type, size })
        .getRawMany();
      return results;
    } else if (category === "insert") {
      const results = await this.threadedInsertRepo
        .createQueryBuilder("i")
        .select("DISTINCT i.material", "material")
        .addSelect("NULL", "grade")
        .where("i.insert_type = :type AND i.designation = :size", { type, size })
        .getRawMany();
      return results;
    }
    return [];
  }
}
