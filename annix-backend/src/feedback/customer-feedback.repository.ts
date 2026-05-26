import { CrudRepository } from "../lib/persistence/crud-repository";
import { CustomerFeedback } from "./entities/customer-feedback.entity";

export abstract class CustomerFeedbackRepository extends CrudRepository<CustomerFeedback> {
  abstract findByGithubIssueNumber(issueNumber: number): Promise<CustomerFeedback | null>;
  abstract findManyByIds(ids: number[]): Promise<CustomerFeedback[]>;
  abstract findAllOrdered(): Promise<CustomerFeedback[]>;
}
