import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { BoqSectionRepository } from "./boq-section.repository";
import { BoqSection } from "./entities/boq-section.entity";

@Injectable()
export class PostgresBoqSectionRepository
  extends TypeOrmCrudRepository<BoqSection>
  implements BoqSectionRepository
{
  constructor(@InjectRepository(BoqSection) repository: Repository<BoqSection>) {
    super(repository);
  }

  async deleteByBoqId(boqId: number): Promise<void> {
    await this.repository.delete({ boqId });
  }

  findByBoqId(boqId: number): Promise<BoqSection[]> {
    return this.repository.find({ where: { boqId }, order: { id: "ASC" } });
  }

  findByBoqIdAndSectionTypes(boqId: number, sectionTypes: string[]): Promise<BoqSection[]> {
    return this.repository.find({
      where: { boqId, sectionType: In(sectionTypes) },
      order: { id: "ASC" },
    });
  }

  findByBoqIds(boqIds: number[]): Promise<BoqSection[]> {
    return this.repository.find({ where: { boqId: In(boqIds) } });
  }

  findByBoqIdsAndSectionTypes(boqIds: number[], sectionTypes: string[]): Promise<BoqSection[]> {
    return this.repository.find({
      where: { boqId: In(boqIds), sectionType: In(sectionTypes) },
      select: ["boqId", "sectionType"],
    });
  }
}
