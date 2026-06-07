import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SeekerTestingIssue } from "../entities/seeker-testing-issue.entity";

export abstract class SeekerTestingIssueRepository extends CrudRepository<SeekerTestingIssue> {
  abstract listNewestFirst(): Promise<SeekerTestingIssue[]>;
  abstract listByStatus(status: string): Promise<SeekerTestingIssue[]>;
  abstract countOpenCritical(): Promise<number>;
}
