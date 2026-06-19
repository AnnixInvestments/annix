export class SeekerWorkflowStep {
  id: string;

  participantId: string;

  stepKey: string;

  completed: boolean;

  completedAt: Date | null;

  timeTakenSeconds: number | null;

  errorMessage: string | null;

  createdAt: Date;

  updatedAt: Date;
}
