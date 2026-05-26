import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { PvcPipeSpecification } from "./entities/pvc-pipe-specification.entity";
import { PvcPipeSpecificationRepository } from "./pvc-pipe-specification.repository";

@Injectable()
export class MongoPvcPipeSpecificationRepository
  extends MongoCrudRepository<PvcPipeSpecification>
  implements PvcPipeSpecificationRepository
{
  constructor(@InjectModel("PvcPipeSpecification") model: Model<PvcPipeSpecification>) {
    super(model);
  }

  async findActive(): Promise<PvcPipeSpecification[]> {
    const documents = await this.documents
      .find({ isActive: true })
      .sort({ nominalDiameter: 1, pressureRating: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByDN(nominalDiameter: number): Promise<PvcPipeSpecification[]> {
    const documents = await this.documents
      .find({ nominalDiameter, isActive: true })
      .sort({ pressureRating: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByDNAndPN(
    nominalDiameter: number,
    pressureRating: number,
    pvcType: string,
  ): Promise<PvcPipeSpecification | null> {
    const document = await this.documents
      .findOne({ nominalDiameter, pressureRating, pvcType, isActive: true })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findDistinctActiveDNs(): Promise<number[]> {
    const values = await this.documents.distinct("nominalDiameter", { isActive: true }).exec();
    return (values as number[]).sort((a, b) => a - b);
  }

  async findActiveByDN(nominalDiameter: number): Promise<PvcPipeSpecification[]> {
    const documents = await this.documents
      .find({ nominalDiameter, isActive: true })
      .sort({ pressureRating: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
