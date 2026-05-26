import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CustomerFeedbackRepository } from "./customer-feedback.repository";
import { CustomerFeedback } from "./entities/customer-feedback.entity";

@Injectable()
export class MongoCustomerFeedbackRepository
  extends MongoCrudRepository<CustomerFeedback>
  implements CustomerFeedbackRepository
{
  constructor(@InjectModel("CustomerFeedback") model: Model<CustomerFeedback>) {
    super(model);
  }

  async findByGithubIssueNumber(issueNumber: number): Promise<CustomerFeedback | null> {
    const document = await this.documents.findOne({ githubIssueNumber: issueNumber }).lean().exec();
    return this.toDomain(document);
  }

  async findManyByIds(ids: number[]): Promise<CustomerFeedback[]> {
    const documents = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findAllOrdered(): Promise<CustomerFeedback[]> {
    const documents = await this.documents.find().sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(documents);
  }
}
