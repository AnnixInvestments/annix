import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DateTime, now } from "../../lib/datetime";
import { Candidate, CandidateStatus } from "../entities/candidate.entity";
import {
  CvAssistantCandidateEeAttributes,
  EeDisabilityStatus,
  EeGender,
  EePopulationGroup,
} from "../entities/cv-assistant-candidate-ee-attributes.entity";
import { CvAssistantCompany } from "../entities/cv-assistant-company.entity";
import {
  CvAssistantEeSectoralTarget,
  EeTargetMetric,
} from "../entities/cv-assistant-ee-sectoral-target.entity";
import { JobPosting, OccupationalLevel } from "../entities/job-posting.entity";
import { CvAuditService } from "./cv-audit.service";

const DISABILITY_WORKFORCE_TARGET_PERCENT = 3.0;
const UNKNOWN_LEVEL = "unknown" as const;
type ReportOccupationalLevel = OccupationalLevel | typeof UNKNOWN_LEVEL;

const ALL_LEVELS: ReportOccupationalLevel[] = [
  OccupationalLevel.TOP_MANAGEMENT,
  OccupationalLevel.SENIOR_MANAGEMENT,
  OccupationalLevel.PROFESSIONALLY_QUALIFIED,
  OccupationalLevel.SKILLED,
  OccupationalLevel.SEMI_SKILLED,
  OccupationalLevel.UNSKILLED,
  UNKNOWN_LEVEL,
];

const POPULATION_VALUES: EePopulationGroup[] = [
  EePopulationGroup.AFRICAN_BLACK,
  EePopulationGroup.COLOURED,
  EePopulationGroup.INDIAN,
  EePopulationGroup.WHITE,
  EePopulationGroup.PREFER_NOT_TO_SAY,
];

const GENDER_VALUES: EeGender[] = [
  EeGender.FEMALE,
  EeGender.MALE,
  EeGender.OTHER,
  EeGender.PREFER_NOT_TO_SAY,
];

const DISABILITY_VALUES: EeDisabilityStatus[] = [
  EeDisabilityStatus.YES,
  EeDisabilityStatus.NO,
  EeDisabilityStatus.PREFER_NOT_TO_SAY,
];

interface RawRow {
  candidate_id: number;
  candidate_status: CandidateStatus;
  occupational_level: OccupationalLevel | null;
  population_group: EePopulationGroup;
  gender: EeGender;
  disability_status: EeDisabilityStatus;
}

export interface OccupationalLevelBreakdown {
  occupationalLevel: ReportOccupationalLevel;
  applicants: number;
  newHires: number;
  byPopulation: Record<EePopulationGroup, number>;
  byGender: Record<EeGender, number>;
  byDisability: Record<EeDisabilityStatus, number>;
}

export interface SectorTargetComparison {
  occupationalLevel: string;
  metric: EeTargetMetric;
  targetPercent: number;
  actualPercent: number;
  met: boolean;
  gazetteReference: string | null;
}

export interface EeReport {
  companyId: number;
  companyName: string;
  economicSector: string | null;
  isDesignatedEmployer: boolean;
  dateFrom: Date;
  dateTo: Date;
  totalApplicantsWithDisclosure: number;
  totalNewHiresWithDisclosure: number;
  byOccupationalLevel: OccupationalLevelBreakdown[];
  sectorTargetComparisons: SectorTargetComparison[];
  disabilityTarget: {
    targetPercent: number;
    actualPercent: number;
    sampleSize: number;
    met: boolean;
  };
  yearOverYear: {
    previousTotalApplicants: number;
    delta: number;
    deltaPercent: number | null;
  };
  generatedAt: Date;
}

@Injectable()
export class EeReportService {
  constructor(
    @InjectRepository(CvAssistantCompany)
    private readonly companyRepo: Repository<CvAssistantCompany>,
    @InjectRepository(CvAssistantCandidateEeAttributes)
    private readonly eeAttributesRepo: Repository<CvAssistantCandidateEeAttributes>,
    @InjectRepository(CvAssistantEeSectoralTarget)
    private readonly sectoralTargetRepo: Repository<CvAssistantEeSectoralTarget>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    private readonly cvAuditService: CvAuditService,
  ) {}

  async buildReport(
    companyId: number,
    dateFrom: Date,
    dateTo: Date,
    actorId: number | null,
  ): Promise<EeReport> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException("Company not found");
    if (!company.isDesignatedEmployer) {
      throw new ForbiddenException(
        "EE reporting is only available for companies flagged as designated employers",
      );
    }

    const rows = await this.queryDisclosedRows(companyId, dateFrom, dateTo);

    const byLevel = this.groupByOccupationalLevel(rows);

    const totalApplicants = rows.length;
    const totalNewHires = rows.filter(
      (r) => r.candidate_status === CandidateStatus.ACCEPTED,
    ).length;

    const sectorTargetComparisons = company.economicSector
      ? await this.buildSectorTargetComparisons(company.economicSector, byLevel, totalApplicants)
      : [];

    const disabilityTarget = this.computeDisabilityTarget(rows);

    const previousFrom = DateTime.fromJSDate(dateFrom).minus({ years: 1 }).toJSDate();
    const previousTo = DateTime.fromJSDate(dateTo).minus({ years: 1 }).toJSDate();
    const previousRows = await this.queryDisclosedRows(companyId, previousFrom, previousTo);
    const previousTotal = previousRows.length;

    await this.cvAuditService.logEeAttributesAccess(
      0,
      "ee_report",
      actorId,
      `report:company=${companyId}:from=${dateFrom.toISOString()}:to=${dateTo.toISOString()}`,
    );

    return {
      companyId,
      companyName: company.name,
      economicSector: company.economicSector,
      isDesignatedEmployer: company.isDesignatedEmployer,
      dateFrom,
      dateTo,
      totalApplicantsWithDisclosure: totalApplicants,
      totalNewHiresWithDisclosure: totalNewHires,
      byOccupationalLevel: byLevel,
      sectorTargetComparisons,
      disabilityTarget,
      yearOverYear: {
        previousTotalApplicants: previousTotal,
        delta: totalApplicants - previousTotal,
        deltaPercent:
          previousTotal === 0 ? null : ((totalApplicants - previousTotal) / previousTotal) * 100,
      },
      generatedAt: now().toJSDate(),
    };
  }

  private async queryDisclosedRows(
    companyId: number,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<RawRow[]> {
    return this.eeAttributesRepo
      .createQueryBuilder("ee")
      .innerJoin("cv_assistant_candidates", "candidate", "candidate.id = ee.candidate_id")
      .innerJoin(
        "cv_assistant_job_postings",
        "job_posting",
        "job_posting.id = candidate.job_posting_id",
      )
      .where("job_posting.company_id = :companyId", { companyId })
      .andWhere("ee.deleted_at IS NULL")
      .andWhere("ee.consent_granted_at >= :dateFrom", { dateFrom })
      .andWhere("ee.consent_granted_at < :dateTo", { dateTo })
      .select([
        "candidate.id AS candidate_id",
        "candidate.status AS candidate_status",
        "job_posting.occupational_level AS occupational_level",
        "ee.population_group AS population_group",
        "ee.gender AS gender",
        "ee.disability_status AS disability_status",
      ])
      .getRawMany<RawRow>();
  }

  private groupByOccupationalLevel(rows: RawRow[]): OccupationalLevelBreakdown[] {
    return ALL_LEVELS.map((level) => {
      const inLevel = rows.filter((r) => (r.occupational_level ?? UNKNOWN_LEVEL) === level);
      return {
        occupationalLevel: level,
        applicants: inLevel.length,
        newHires: inLevel.filter((r) => r.candidate_status === CandidateStatus.ACCEPTED).length,
        byPopulation: tally(inLevel, "population_group", POPULATION_VALUES),
        byGender: tally(inLevel, "gender", GENDER_VALUES),
        byDisability: tally(inLevel, "disability_status", DISABILITY_VALUES),
      };
    }).filter((b) => b.applicants > 0);
  }

  private async buildSectorTargetComparisons(
    sectorCode: string,
    byLevel: OccupationalLevelBreakdown[],
    totalApplicants: number,
  ): Promise<SectorTargetComparison[]> {
    const targets = await this.sectoralTargetRepo.find({ where: { sectorCode } });
    return targets.map((target) => {
      const actualPercent = computeActualPercent(target, byLevel, totalApplicants);
      const targetPercent = parseFloat(target.targetPercent);
      return {
        occupationalLevel: target.occupationalLevel,
        metric: target.targetMetric,
        targetPercent,
        actualPercent,
        met: actualPercent >= targetPercent,
        gazetteReference: target.gazetteReference,
      };
    });
  }

  private computeDisabilityTarget(rows: RawRow[]): EeReport["disabilityTarget"] {
    const declaring = rows.filter(
      (r) => r.disability_status !== EeDisabilityStatus.PREFER_NOT_TO_SAY,
    );
    const sampleSize = declaring.length;
    const withDisability = declaring.filter(
      (r) => r.disability_status === EeDisabilityStatus.YES,
    ).length;
    const actualPercent = sampleSize === 0 ? 0 : (withDisability / sampleSize) * 100;
    return {
      targetPercent: DISABILITY_WORKFORCE_TARGET_PERCENT,
      actualPercent,
      sampleSize,
      met: actualPercent >= DISABILITY_WORKFORCE_TARGET_PERCENT,
    };
  }
}

const tally = <T extends string, K extends keyof RawRow>(
  rows: RawRow[],
  key: K,
  values: readonly T[],
): Record<T, number> => {
  const seed = values.reduce(
    (acc, value) => {
      acc[value] = 0;
      return acc;
    },
    {} as Record<T, number>,
  );
  return rows.reduce((acc, row) => {
    const bucket = row[key] as unknown as T;
    acc[bucket] = (acc[bucket] ?? 0) + 1;
    return acc;
  }, seed);
};

const computeActualPercent = (
  target: CvAssistantEeSectoralTarget,
  byLevel: OccupationalLevelBreakdown[],
  totalAcrossLevels: number,
): number => {
  const scoped =
    target.occupationalLevel === "all_levels"
      ? byLevel
      : byLevel.filter((b) => b.occupationalLevel === target.occupationalLevel);

  const scopedApplicants = scoped.reduce((sum, b) => sum + b.applicants, 0);
  if (scopedApplicants === 0) return 0;

  const inGroup = scoped.reduce((sum, b) => sum + countForMetric(b, target.targetMetric), 0);
  return (inGroup / scopedApplicants) * 100;
};

const countForMetric = (breakdown: OccupationalLevelBreakdown, metric: EeTargetMetric): number => {
  switch (metric) {
    case EeTargetMetric.RACE_AFRICAN_BLACK:
      return breakdown.byPopulation[EePopulationGroup.AFRICAN_BLACK];
    case EeTargetMetric.RACE_COLOURED:
      return breakdown.byPopulation[EePopulationGroup.COLOURED];
    case EeTargetMetric.RACE_INDIAN:
      return breakdown.byPopulation[EePopulationGroup.INDIAN];
    case EeTargetMetric.FEMALE:
      return breakdown.byGender[EeGender.FEMALE];
    case EeTargetMetric.DISABILITY:
      return breakdown.byDisability[EeDisabilityStatus.YES];
  }
};
