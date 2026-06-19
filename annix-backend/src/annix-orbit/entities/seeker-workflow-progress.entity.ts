export class SeekerWorkflowProgress {
  id: string;

  participantId: string;

  candidateId: number;

  registeredAt: Date | null;

  cvUploadedAt: Date | null;

  careerScoreGeneratedAt: Date | null;

  firstJobsViewedAt: Date | null;

  timeToFirstValueSeconds: number | null;

  completedSteps: number;

  lastActiveAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
