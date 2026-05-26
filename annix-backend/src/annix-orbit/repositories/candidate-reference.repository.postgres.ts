import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { CandidateReference, ReferenceStatus } from "../entities/candidate-reference.entity";
import { CandidateReferenceRepository } from "./candidate-reference.repository";

@Injectable()
export class PostgresCandidateReferenceRepository
  extends TypeOrmCrudRepository<CandidateReference>
  implements CandidateReferenceRepository
{
  constructor(@InjectRepository(CandidateReference) repository: Repository<CandidateReference>) {
    super(repository);
  }

  findByCandidate(candidateId: number): Promise<CandidateReference[]> {
    return this.repository.find({ where: { candidateId } });
  }

  findByCandidateAndStatus(
    candidateId: number,
    status: ReferenceStatus,
  ): Promise<CandidateReference[]> {
    return this.repository.find({ where: { candidateId, status } });
  }

  findByFeedbackToken(token: string): Promise<CandidateReference | null> {
    return this.repository.findOne({ where: { feedbackToken: token } });
  }

  findByFeedbackTokenWithCandidate(token: string): Promise<CandidateReference | null> {
    return this.repository.findOne({
      where: { feedbackToken: token },
      relations: ["candidate", "candidate.jobPosting"],
    });
  }

  findPendingRemindersBefore(cutoff: Date): Promise<CandidateReference[]> {
    return this.repository.find({
      where: {
        status: ReferenceStatus.REQUESTED,
        requestSentAt: LessThan(cutoff),
        reminderSentAt: null as unknown as Date,
      },
      relations: ["candidate", "candidate.jobPosting"],
    });
  }

  referencesForCompany(companyId: number, status?: ReferenceStatus): Promise<CandidateReference[]> {
    const queryBuilder = this.repository
      .createQueryBuilder("reference")
      .innerJoinAndSelect("reference.candidate", "candidate")
      .innerJoinAndSelect("candidate.jobPosting", "jobPosting")
      .where("jobPosting.companyId = :companyId", { companyId });

    if (status) {
      queryBuilder.andWhere("reference.status = :status", { status });
    }

    return queryBuilder.orderBy("reference.createdAt", "DESC").getMany();
  }

  async removeMany(references: CandidateReference[]): Promise<void> {
    await this.repository.remove(references);
  }
}
