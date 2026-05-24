import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { EducationProgramme } from "../entities/education-programme.entity";
import { EducationProgrammeOutcomeSignal } from "../entities/education-programme-outcome-signal.entity";
import { EducationProfileService } from "./education-profile.service";
import { EducationRecommendationService } from "./education-recommendation.service";

export interface ChoiceOptionSignal {
  source: string;
  metric: string;
  value: number;
  unit: string;
  asOf: string | null;
  confidence: string;
  sourceUrl: string | null;
}

export interface ProgrammeChoiceOption {
  programmeId: string;
  programmeName: string;
  institutionId: string;
  /** Eligibility band — carried through UNCHANGED from #308; never recomputed here. */
  band: string;
  careerCluster: string | null;
  clusterMatch: boolean;
  signals: ChoiceOptionSignal[];
  reasons: string[];
  /** Transparent ordering score for the choice-aid only — NOT an eligibility input. */
  fitScore: number;
}

const ELIGIBLE_BANDS = new Set(["safe", "match", "reach"]);

/**
 * The FuturePath choice-aid (#309): help a student pick *between programmes they
 * already qualify for*. STRICT firewall — it consumes the #308 eligibility
 * result read-only and only RE-ORDERS already-eligible options by fit
 * (career-cluster match + curated graduate-outcome signals). It never changes
 * eligibility, and surfaces each signal with its source + recency (no fabricated
 * "best uni" score). Returns [] when the student has no eligible options yet.
 */
@Injectable()
export class EducationChoiceAidService {
  constructor(
    private readonly recommendationService: EducationRecommendationService,
    private readonly profileService: EducationProfileService,
    @InjectRepository(EducationProgramme)
    private readonly programmeRepo: Repository<EducationProgramme>,
    @InjectRepository(EducationProgrammeOutcomeSignal)
    private readonly outcomeSignalRepo: Repository<EducationProgrammeOutcomeSignal>,
  ) {}

  async compareOptions(userId: number, intakeYear: number): Promise<ProgrammeChoiceOption[]> {
    const recommendations = await this.recommendationService.recommendForUser(userId, intakeYear);
    const eligible = recommendations.filter(
      (rec) => rec.result.eligibility.passed && ELIGIBLE_BANDS.has(rec.band),
    );
    if (eligible.length === 0) return [];

    const profile = await this.profileService.profileForUser(userId);
    const targetCategories = new Set(profile?.targetCategories ?? []);

    const programmeIds = eligible.map((rec) => rec.programmeId);
    const programmes = await this.programmeRepo.find({ where: { id: In(programmeIds) } });
    const clusterById = new Map(programmes.map((p) => [p.id, p.careerCluster]));

    const signals = await this.outcomeSignalRepo.find({
      where: { programmeId: In(programmeIds) },
      order: { asOf: "DESC" },
    });
    const signalsByProgramme = signals.reduce((map, signal) => {
      const list = map.get(signal.programmeId) ?? [];
      list.push(signal);
      map.set(signal.programmeId, list);
      return map;
    }, new Map<string, EducationProgrammeOutcomeSignal[]>());

    const options = eligible.map((rec) => {
      const careerCluster = clusterById.get(rec.programmeId) ?? null;
      const clusterMatch = careerCluster != null && targetCategories.has(careerCluster);
      const programmeSignals = (signalsByProgramme.get(rec.programmeId) ?? []).map((s) => ({
        source: s.source,
        metric: s.metric,
        value: Number(s.value),
        unit: s.unit,
        asOf: s.asOf,
        confidence: s.confidence,
        sourceUrl: s.sourceUrl,
      }));

      const reasons: string[] = [];
      if (clusterMatch) reasons.push(`Matches your interest in ${careerCluster}`);
      for (const signal of programmeSignals) {
        const asOf = signal.asOf ? ` (as of ${signal.asOf})` : "";
        reasons.push(`${signal.source}: ${signal.metric} = ${signal.value}${signal.unit}${asOf}`);
      }
      if (reasons.length === 0) reasons.push("No outcome data yet — eligibility only");

      const employment = programmeSignals.find((s) => s.metric.startsWith("employment_rate"));
      const fitScore = (clusterMatch ? 100 : 0) + (employment ? employment.value : 0);

      return {
        programmeId: rec.programmeId,
        programmeName: rec.programmeName,
        institutionId: rec.institutionId,
        band: rec.band,
        careerCluster,
        clusterMatch,
        signals: programmeSignals,
        reasons,
        fitScore,
      };
    });

    return options.sort((a, b) => b.fitScore - a.fitScore);
  }
}
