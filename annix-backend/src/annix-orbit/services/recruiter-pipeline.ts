import type { AnnixOrbitSubmissionStatus } from "../entities/annix-orbit-submission.entity";
import {
  ORBIT_PIPELINE_STAGES,
  type OrbitPipelineStage,
} from "../entities/annix-orbit-talent-candidate.entity";

// Canonical recruiter pipeline (issue #362 phase 0). The funnel is
// candidate-centric: a candidate's effective stage is the furthest of
// (a) the manual `pipelineStage` a recruiter set, (b) the stage implied
// by their submissions, (c) "placed" when the candidate is marked placed.
// This makes the funnel real even before recruiters touch the manual
// field — submissions/placements drive it — while still letting them set
// the screened / shortlisted steps that have no other data source.
export const ORBIT_PIPELINE_STAGE_LABELS: Record<OrbitPipelineStage, string> = {
  identified: "Identified",
  screened: "Screened",
  shortlisted: "Shortlisted",
  submitted: "Submitted",
  interview: "Interview",
  offer: "Offer",
  placed: "Placed",
};

export function pipelineStageIndex(stage: string | null | undefined): number {
  if (!stage) {
    return 0;
  }
  const index = ORBIT_PIPELINE_STAGES.indexOf(stage as OrbitPipelineStage);
  return index < 0 ? 0 : index;
}

// Map a submission's status onto the pipeline. A submission of any
// outcome means the candidate reached at least "submitted"; interview /
// offer / placed advance further. rejected / no_response do not pull a
// candidate back below submitted.
export function submissionStageIndex(status: AnnixOrbitSubmissionStatus): number {
  if (status === "placed") return pipelineStageIndex("placed");
  if (status === "offer") return pipelineStageIndex("offer");
  if (status === "interview") return pipelineStageIndex("interview");
  return pipelineStageIndex("submitted");
}

export interface PipelineCandidateInput {
  pipelineStage?: string | null;
  status?: string | null;
}

export function effectiveStageIndex(
  candidate: PipelineCandidateInput,
  submissionStatuses: AnnixOrbitSubmissionStatus[],
): number {
  const manual = pipelineStageIndex(candidate.pipelineStage);
  const placedByStatus = candidate.status === "placed" ? pipelineStageIndex("placed") : 0;
  const fromSubmissions = submissionStatuses.reduce(
    (max, status) => Math.max(max, submissionStageIndex(status)),
    0,
  );
  return Math.max(manual, placedByStatus, fromSubmissions);
}

export interface PipelineFunnelStage {
  key: OrbitPipelineStage;
  label: string;
  count: number;
  pct: number;
}

export interface PipelineFunnel {
  stages: PipelineFunnelStage[];
  conversionRate: number;
}

// Cumulative funnel: count[stage] = candidates who reached AT LEAST that
// stage. Percentages are relative to the total (identified) pool.
export function buildPipelineFunnel(effectiveIndexes: number[]): PipelineFunnel {
  const total = effectiveIndexes.length;
  const stages = ORBIT_PIPELINE_STAGES.map((key, index) => {
    const count = effectiveIndexes.reduce((acc, value) => (value >= index ? acc + 1 : acc), 0);
    const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
    return { key, label: ORBIT_PIPELINE_STAGE_LABELS[key], count, pct };
  });
  const placedIndex = pipelineStageIndex("placed");
  const placed = effectiveIndexes.reduce((acc, value) => (value >= placedIndex ? acc + 1 : acc), 0);
  const conversionRate = total > 0 ? Math.round((placed / total) * 1000) / 10 : 0;
  return { stages, conversionRate };
}
