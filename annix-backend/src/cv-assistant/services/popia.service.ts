import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { DateTime } from "../../lib/datetime";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { Candidate } from "../entities/candidate.entity";
import { CandidateReference } from "../entities/candidate-reference.entity";

@Injectable()
export class PopiaService {
  private readonly logger = new Logger(PopiaService.name);
  private static readonly RETENTION_MONTHS = 12;

  constructor(
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(CandidateReference)
    private readonly referenceRepo: Repository<CandidateReference>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: "cv-assistant:purge-inactive" })
  async purgeInactiveCandidates(): Promise<{ purged: number }> {
    const cutoffDate = DateTime.now().minus({ months: PopiaService.RETENTION_MONTHS }).toJSDate();

    const inactiveCandidates = await this.candidateRepo.find({
      where: [
        { lastActiveAt: LessThan(cutoffDate) },
        { lastActiveAt: null as unknown as Date, createdAt: LessThan(cutoffDate) },
      ],
      relations: ["references"],
    });

    const purged = await inactiveCandidates.reduce(async (accPromise, candidate) => {
      const acc = await accPromise;
      try {
        await this.eraseCandidateData(candidate);
        return acc + 1;
      } catch (error) {
        this.logger.error(
          `Failed to purge candidate ${candidate.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        return acc;
      }
    }, Promise.resolve(0));

    if (purged > 0) {
      this.logger.log(
        `POPIA retention: purged ${purged} inactive candidates (${PopiaService.RETENTION_MONTHS}+ months)`,
      );
    }

    return { purged };
  }

  async eraseCandidateData(candidate: Candidate): Promise<void> {
    if (candidate.cvFilePath) {
      try {
        await this.storageService.delete(candidate.cvFilePath);
      } catch (error) {
        this.logger.warn(
          `Could not delete CV file for candidate ${candidate.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (candidate.references?.length > 0) {
      await this.referenceRepo.remove(candidate.references);
    }

    await this.candidateRepo.remove(candidate);
  }

  async rightToErasure(companyId: number, candidateId: number): Promise<{ message: string }> {
    const candidate = await this.candidateRepo.findOne({
      where: { id: candidateId },
      relations: ["jobPosting", "references"],
    });

    if (!candidate || candidate.jobPosting.companyId !== companyId) {
      return { message: "Candidate not found" };
    }

    await this.eraseCandidateData(candidate);

    this.logger.log(
      `POPIA right to erasure exercised for candidate ${candidateId} by company ${companyId}`,
    );

    return {
      message: "All candidate data has been permanently deleted per POPIA right to erasure",
    };
  }

  async retentionStats(companyId: number): Promise<{
    totalCandidates: number;
    expiringWithin30Days: number;
    withConsent: number;
    withoutConsent: number;
  }> {
    const thirtyDaysFromExpiry = DateTime.now()
      .minus({ months: PopiaService.RETENTION_MONTHS })
      .plus({ days: 30 })
      .toJSDate();

    const expiryDate = DateTime.now().minus({ months: PopiaService.RETENTION_MONTHS }).toJSDate();

    const candidates = await this.candidateRepo
      .createQueryBuilder("candidate")
      .innerJoin("candidate.jobPosting", "jobPosting")
      .where("jobPosting.companyId = :companyId", { companyId })
      .getMany();

    const expiringWithin30Days = candidates.filter((c) => {
      const activeDate = c.lastActiveAt || c.createdAt;
      return activeDate <= thirtyDaysFromExpiry && activeDate > expiryDate;
    }).length;

    const withConsent = candidates.filter((c) => c.popiaConsent).length;

    return {
      totalCandidates: candidates.length,
      expiringWithin30Days,
      withConsent,
      withoutConsent: candidates.length - withConsent,
    };
  }
}
