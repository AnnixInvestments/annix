import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { StockControlDepartment } from "../entities/stock-control-department.entity";
import { StockControlDepartmentRepository } from "./stock-control-department.repository";

@Injectable()
export class MongoStockControlDepartmentRepository
  extends MongoCrudRepository<StockControlDepartment>
  implements StockControlDepartmentRepository
{
  constructor(@InjectModel("StockControlDepartment") model: Model<StockControlDepartment>) {
    super(model);
  }

  async findActiveForCompanyOrdered(companyId: number): Promise<StockControlDepartment[]> {
    const docs = await this.documents
      .find({ companyId, active: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllForCompanyOrdered(companyId: number): Promise<StockControlDepartment[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ displayOrder: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(id: number, companyId: number): Promise<StockControlDepartment | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
