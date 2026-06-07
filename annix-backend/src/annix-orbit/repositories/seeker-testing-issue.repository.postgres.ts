import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SeekerTestingIssue } from "../entities/seeker-testing-issue.entity";
import { SeekerTestingIssueRepository } from "./seeker-testing-issue.repository";

@Injectable()
export class PostgresSeekerTestingIssueRepository
  extends TypeOrmCrudRepository<SeekerTestingIssue>
  implements SeekerTestingIssueRepository
{
  constructor(@InjectRepository(SeekerTestingIssue) repository: Repository<SeekerTestingIssue>) {
    super(repository);
  }

  listNewestFirst(): Promise<SeekerTestingIssue[]> {
    return this.repository.find({ order: { createdAt: "DESC" } });
  }

  listByStatus(status: string): Promise<SeekerTestingIssue[]> {
    return this.repository.find({ where: { status }, order: { createdAt: "DESC" } });
  }

  countOpenCritical(): Promise<number> {
    return this.repository.count({
      where: { severity: "critical", status: In(["open", "in_progress"]) },
    });
  }
}
