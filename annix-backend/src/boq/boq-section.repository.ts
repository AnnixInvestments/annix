import { CrudRepository } from "../lib/persistence/crud-repository";
import { BoqSection } from "./entities/boq-section.entity";

export abstract class BoqSectionRepository extends CrudRepository<BoqSection> {
  abstract deleteByBoqId(boqId: number): Promise<void>;
  abstract findByBoqId(boqId: number): Promise<BoqSection[]>;
  abstract findByBoqIdAndSectionTypes(boqId: number, sectionTypes: string[]): Promise<BoqSection[]>;
  abstract findByBoqIds(boqIds: number[]): Promise<BoqSection[]>;
  abstract findByBoqIdsAndSectionTypes(
    boqIds: number[],
    sectionTypes: string[],
  ): Promise<BoqSection[]>;
}
