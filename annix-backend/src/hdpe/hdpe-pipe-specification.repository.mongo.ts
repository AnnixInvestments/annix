import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { HdpePipeSpecification } from "./entities/hdpe-pipe-specification.entity";
import { HdpePipeSpecificationRepository } from "./hdpe-pipe-specification.repository";

@Injectable()
export class MongoHdpePipeSpecificationRepository
  extends MongoCrudRepository<HdpePipeSpecification>
  implements HdpePipeSpecificationRepository
{
  constructor(@InjectModel("HdpePipeSpecification") model: Model<HdpePipeSpecification>) {
    super(model);
  }

  async findByNominalBoreAndSdr(
    nominalBore: number,
    sdr: number,
  ): Promise<HdpePipeSpecification | null> {
    const document = await this.documents
      .findOne({ nominalBore, sdr, isActive: true })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findAllByNominalBore(nominalBore: number): Promise<HdpePipeSpecification[]> {
    const documents = await this.documents
      .find({ nominalBore, isActive: true })
      .sort({ sdr: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findActiveOrderedByNominalBoreAndSdr(): Promise<HdpePipeSpecification[]> {
    const documents = await this.documents
      .find({ isActive: true })
      .sort({ nominalBore: 1, sdr: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findDistinctNominalBores(): Promise<number[]> {
    const values = await this.documents.distinct("nominalBore", { isActive: true }).exec();
    return (values as number[]).sort((a, b) => a - b);
  }
}
