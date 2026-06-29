import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SalesRep } from "../entities/sales-rep.entity";
import { SalesRepRepository } from "./sales-rep.repository";

@Injectable()
export class MongoSalesRepRepository
  extends MongoCrudRepository<SalesRep>
  implements SalesRepRepository
{
  constructor(
    @InjectModel("SalesRep")
    model: Model<SalesRep>,
  ) {
    super(model);
  }

  build(data: Partial<SalesRep>): SalesRep {
    return data as SalesRep;
  }

  async findByCompanyId(companyId: number): Promise<SalesRep[]> {
    const docs = await this.documents.find({ companyId }).sort({ name: 1 }).lean().exec();
    return this.toDomainList(docs);
  }
}
