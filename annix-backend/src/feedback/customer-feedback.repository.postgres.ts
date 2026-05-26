import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { CustomerFeedbackRepository } from "./customer-feedback.repository";
import { CustomerFeedback } from "./entities/customer-feedback.entity";

@Injectable()
export class PostgresCustomerFeedbackRepository
  extends TypeOrmCrudRepository<CustomerFeedback>
  implements CustomerFeedbackRepository
{
  constructor(@InjectRepository(CustomerFeedback) repository: Repository<CustomerFeedback>) {
    super(repository);
  }

  findByGithubIssueNumber(issueNumber: number): Promise<CustomerFeedback | null> {
    return this.repository.findOne({ where: { githubIssueNumber: issueNumber } });
  }

  findManyByIds(ids: number[]): Promise<CustomerFeedback[]> {
    return this.repository.find({ where: { id: In(ids) } });
  }

  findAllOrdered(): Promise<CustomerFeedback[]> {
    return this.repository.find({
      relations: ["customerProfile", "customerProfile.company", "assignedTo", "attachments"],
      order: { createdAt: "DESC" },
    });
  }
}
