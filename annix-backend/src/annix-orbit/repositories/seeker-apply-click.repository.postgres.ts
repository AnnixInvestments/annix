import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThanOrEqual, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SeekerApplyClick } from "../entities/seeker-apply-click.entity";
import { SeekerApplyClickRepository } from "./seeker-apply-click.repository";

@Injectable()
export class PostgresSeekerApplyClickRepository
  extends TypeOrmCrudRepository<SeekerApplyClick>
  implements SeekerApplyClickRepository
{
  constructor(@InjectRepository(SeekerApplyClick) repository: Repository<SeekerApplyClick>) {
    super(repository);
  }

  findRecentClick(
    candidateId: number,
    externalJobId: number,
    cutoff: Date,
  ): Promise<SeekerApplyClick | null> {
    return this.repository.findOne({
      where: {
        candidateId,
        externalJobId,
        clickedAt: MoreThanOrEqual(cutoff),
      },
    });
  }
}
