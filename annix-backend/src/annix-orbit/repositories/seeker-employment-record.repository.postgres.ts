import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { SeekerEmploymentRecord } from "../entities/seeker-employment-record.entity";
import { SeekerEmploymentRecordRepository } from "./seeker-employment-record.repository";

@Injectable()
export class PostgresSeekerEmploymentRecordRepository
  extends TypeOrmCrudRepository<SeekerEmploymentRecord>
  implements SeekerEmploymentRecordRepository
{
  constructor(
    @InjectRepository(SeekerEmploymentRecord) repository: Repository<SeekerEmploymentRecord>,
  ) {
    super(repository);
  }

  listForCandidates(candidateIds: number[]): Promise<SeekerEmploymentRecord[]> {
    if (candidateIds.length === 0) return Promise.resolve([]);
    return this.repository.find({
      where: { candidateId: In(candidateIds) },
      order: { startDate: "DESC" },
    });
  }
}
