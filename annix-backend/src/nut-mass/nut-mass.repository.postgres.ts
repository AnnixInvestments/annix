import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Bolt } from "../bolt/entities/bolt.entity";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { NutMass } from "./entities/nut-mass.entity";
import { NutMassRepository } from "./nut-mass.repository";

@Injectable()
export class PostgresNutMassRepository
  extends TypeOrmCrudRepository<NutMass>
  implements NutMassRepository
{
  constructor(
    @InjectRepository(NutMass) repository: Repository<NutMass>,
    @InjectRepository(Bolt) private readonly boltRepo: Repository<Bolt>,
  ) {
    super(repository);
  }

  findAllWithBolt(): Promise<NutMass[]> {
    return this.repository.find({ relations: ["bolt"] });
  }

  findOneWithBolt(id: number): Promise<NutMass | null> {
    return this.repository.findOne({ where: { id }, relations: ["bolt"] });
  }

  findExisting(boltId: number, mass_kg: number): Promise<NutMass | null> {
    return this.repository.findOne({
      where: { bolt: { id: boltId }, mass_kg },
    });
  }

  findByBoltId(boltId: number): Promise<NutMass | null> {
    return this.repository.findOne({
      where: { bolt: { id: boltId } },
    });
  }

  findBolt(id: number): Promise<Bolt | null> {
    return this.boltRepo.findOne({ where: { id } });
  }

  createNut(data: Partial<NutMass>): Promise<NutMass> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  saveNut(entity: NutMass): Promise<NutMass> {
    return this.repository.save(entity);
  }

  async removeNut(entity: NutMass): Promise<void> {
    await this.repository.remove(entity);
  }

  async typesGrouped(): Promise<Array<{ type: string; count: number }>> {
    return this.repository
      .createQueryBuilder("n")
      .select("n.type", "type")
      .addSelect("COUNT(*)", "count")
      .where("n.type IS NOT NULL")
      .groupBy("n.type")
      .getRawMany();
  }

  async boltDesignationsForType(type: string): Promise<Array<{ size: string }>> {
    return this.repository
      .createQueryBuilder("n")
      .innerJoin("n.bolt", "b")
      .select("DISTINCT b.designation", "size")
      .where("n.type = :type", { type })
      .orderBy("b.designation", "ASC")
      .getRawMany();
  }

  async gradesForTypeAndSize(
    type: string,
    size: string,
  ): Promise<Array<{ grade: string | null; material: string | null }>> {
    return this.repository
      .createQueryBuilder("n")
      .innerJoin("n.bolt", "b")
      .select("DISTINCT n.grade", "grade")
      .addSelect("'Carbon Steel'", "material")
      .where("n.type = :type AND b.designation = :size", { type, size })
      .getRawMany();
  }
}
