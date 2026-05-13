import type { TradeKey } from "@annix/product-data/sa-market";
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Rfq } from "../../rfq/entities/rfq.entity";
import { Candidate } from "../entities/candidate.entity";
import { CvCredential } from "../entities/cv-credential.entity";
import { GeocodeService, haversineKm } from "./geocode.service";

export interface WorkforceNeedSummary {
  rfqId: number;
  projectLocation: string | null;
  hasProjectCoords: boolean;
  requiredTrades: TradeKey[];
  estimatedHeadcount: number | null;
  radiusKm: number | null;
  counts: {
    totalMatching: number;
    withValidMedical: number;
    withValidMineInduction: number;
    availableNowOr14d: number;
  };
  unmetHeadcount: number | null;
  reason?: "no-required-trades" | "no-radius" | "no-project-location";
}

@Injectable()
export class WorkforceNeedService {
  private readonly logger = new Logger(WorkforceNeedService.name);

  constructor(
    @InjectRepository(Rfq)
    private readonly rfqRepo: Repository<Rfq>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
    @InjectRepository(CvCredential)
    private readonly credentialRepo: Repository<CvCredential>,
    private readonly geocodeService: GeocodeService,
  ) {}

  async calculateForRfq(rfqId: number): Promise<WorkforceNeedSummary | null> {
    const rfq = await this.rfqRepo.findOne({ where: { id: rfqId } });
    if (!rfq) return null;

    const requiredTrades = (rfq.requiredTrades ?? []) as TradeKey[];
    const radiusKm = rfq.radiusKm ?? null;
    const estimatedHeadcount = rfq.estimatedHeadcount ?? null;
    const projectLocation = rfq.projectLocation ?? null;

    const baseSummary: WorkforceNeedSummary = {
      rfqId: rfq.id,
      projectLocation,
      hasProjectCoords: rfq.projectLocationLat != null && rfq.projectLocationLon != null,
      requiredTrades,
      estimatedHeadcount,
      radiusKm,
      counts: {
        totalMatching: 0,
        withValidMedical: 0,
        withValidMineInduction: 0,
        availableNowOr14d: 0,
      },
      unmetHeadcount: estimatedHeadcount,
    };

    if (requiredTrades.length === 0) {
      return { ...baseSummary, reason: "no-required-trades" };
    }
    if (radiusKm == null) {
      return { ...baseSummary, reason: "no-radius" };
    }
    if (!projectLocation) {
      return { ...baseSummary, reason: "no-project-location" };
    }

    let projectLat = rfq.projectLocationLat ?? null;
    let projectLon = rfq.projectLocationLon ?? null;
    if (projectLat == null || projectLon == null) {
      const geocoded = await this.geocodeService.geocode(projectLocation);
      if (geocoded) {
        projectLat = geocoded.lat;
        projectLon = geocoded.lon;
        await this.rfqRepo.update(rfq.id, {
          projectLocationLat: geocoded.lat,
          projectLocationLon: geocoded.lon,
        });
      }
    }

    const matchingCandidates = await this.candidatesMatchingTrades(requiredTrades);
    const within = matchingCandidates.filter((candidate) => {
      if (candidate.locationLat == null || candidate.locationLon == null) return false;
      if (projectLat == null || projectLon == null) return false;
      const distance = haversineKm(
        { lat: projectLat, lon: projectLon },
        { lat: candidate.locationLat, lon: candidate.locationLon },
      );
      return distance <= radiusKm;
    });

    const totalMatching = within.length;
    if (totalMatching === 0) {
      return {
        ...baseSummary,
        hasProjectCoords: projectLat != null && projectLon != null,
        counts: {
          totalMatching: 0,
          withValidMedical: 0,
          withValidMineInduction: 0,
          availableNowOr14d: 0,
        },
        unmetHeadcount: estimatedHeadcount,
      };
    }

    const candidateIds = within.map((c) => c.id);
    const credentials = await this.validCredentialsForCandidates(candidateIds);

    const validMedicalIds = new Set(
      credentials.filter((c) => c.credentialType === "medical").map((c) => c.candidateId),
    );
    const validInductionIds = new Set(
      credentials.filter((c) => c.credentialType === "mine_induction").map((c) => c.candidateId),
    );

    const availableNowOr14d = within.filter((candidate) => {
      const availability = candidate.tradeProfile?.shared.availability;
      return availability === "available_now" || availability === "14d_notice";
    }).length;

    const counts = {
      totalMatching,
      withValidMedical: within.filter((c) => validMedicalIds.has(c.id)).length,
      withValidMineInduction: within.filter((c) => validInductionIds.has(c.id)).length,
      availableNowOr14d,
    };

    const unmet =
      estimatedHeadcount == null ? null : Math.max(0, estimatedHeadcount - totalMatching);

    return {
      ...baseSummary,
      hasProjectCoords: projectLat != null && projectLon != null,
      counts,
      unmetHeadcount: unmet,
    };
  }

  private async candidatesMatchingTrades(tradeKeys: TradeKey[]): Promise<Candidate[]> {
    if (tradeKeys.length === 0) return [];
    const candidates = await this.candidateRepo
      .createQueryBuilder("c")
      .where(`c.trade_profile -> 'shared' -> 'tradeKeys' ?| ARRAY[:...keys]`, { keys: tradeKeys })
      .getMany();
    return candidates;
  }

  private async validCredentialsForCandidates(candidateIds: number[]): Promise<CvCredential[]> {
    if (candidateIds.length === 0) return [];
    const today = new Date().toISOString().slice(0, 10);
    return this.credentialRepo
      .createQueryBuilder("c")
      .where("c.candidate_id IN (:...ids)", { ids: candidateIds })
      .andWhere("(c.expires_at IS NULL OR c.expires_at >= :today)", { today })
      .getMany();
  }
}
