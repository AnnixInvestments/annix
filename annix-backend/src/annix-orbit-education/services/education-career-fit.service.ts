import {
  CLUSTER_CAPABILITY_AFFINITY,
  nscCapabilityForSubject,
  ORBIT_EDUCATION_CAREER_CLUSTER_META,
  ORBIT_EDUCATION_CAREER_CLUSTERS,
  type OrbitEducationCapability,
  type OrbitEducationCareerCluster,
} from "@annix/product-data/orbit-education";
import { Injectable } from "@nestjs/common";
import { EducationConsentService } from "./education-consent.service";
import { EducationProfileService } from "./education-profile.service";

export interface CareerFitResult {
  cluster: OrbitEducationCareerCluster;
  label: string;
  /** Subject-alignment score 0–100 — how well your subjects line up with this field.
   *  NOT an admission/employment probability. Null when there's no relevant subject yet. */
  fit: number | null;
  /** The learner has flagged this cluster as an interest (does NOT inflate the fit). */
  interested: boolean;
  reasons: string[];
}

@Injectable()
export class EducationCareerFitService {
  constructor(
    private readonly profileService: EducationProfileService,
    private readonly consentService: EducationConsentService,
  ) {}

  async computeForUser(userId: number): Promise<CareerFitResult[]> {
    const profile = await this.profileService.profileForUser(userId);
    if (!profile) return [];
    await this.consentService.assertProcessingAllowed(profile);

    const results = await this.profileService.resultsForProfile(profile.id);
    // Average mark per capability across the learner's subjects.
    const totals = new Map<OrbitEducationCapability, { sum: number; count: number }>();
    for (const result of results) {
      const capability = nscCapabilityForSubject(result.subject);
      if (!capability) continue;
      const source = result.mark ?? result.predictedMark;
      if (source == null) continue;
      const percent = Number(source);
      const bucket = totals.get(capability) ?? { sum: 0, count: 0 };
      bucket.sum += percent;
      bucket.count += 1;
      totals.set(capability, bucket);
    }
    const capabilityAverage = (capability: OrbitEducationCapability): number | null => {
      const bucket = totals.get(capability);
      return bucket ? bucket.sum / bucket.count : null;
    };

    const targetCategories = new Set(profile.targetCategories ?? []);

    const fits = ORBIT_EDUCATION_CAREER_CLUSTERS.map((cluster) => {
      const affinities = CLUSTER_CAPABILITY_AFFINITY[cluster];
      const scored = affinities
        .map((capability) => ({ capability, average: capabilityAverage(capability) }))
        .filter(
          (entry): entry is { capability: OrbitEducationCapability; average: number } =>
            entry.average != null,
        );
      const interested = targetCategories.has(cluster);
      const reasons: string[] = [];
      if (interested) reasons.push("You flagged this as an interest");

      if (scored.length === 0) {
        reasons.push("No subjects yet that map to this field — add results to see your fit");
        return {
          cluster,
          label: ORBIT_EDUCATION_CAREER_CLUSTER_META[cluster].label,
          fit: null,
          interested,
          reasons,
        };
      }

      const fit = Math.round(scored.reduce((sum, s) => sum + s.average, 0) / scored.length);
      for (const entry of scored) {
        reasons.push(`${entry.capability}: ${Math.round(entry.average)}%`);
      }
      return {
        cluster,
        label: ORBIT_EDUCATION_CAREER_CLUSTER_META[cluster].label,
        fit,
        interested,
        reasons,
      };
    });

    return fits.sort((a, b) => {
      if (a.fit == null && b.fit == null) return 0;
      if (a.fit == null) return 1;
      if (b.fit == null) return -1;
      return b.fit - a.fit;
    });
  }
}
