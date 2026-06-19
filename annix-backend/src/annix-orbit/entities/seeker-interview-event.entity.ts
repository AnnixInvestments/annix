export class SeekerInterviewEvent {
  id: number;

  candidateId: number;

  applyClickId: number | null;

  externalJobId: number | null;

  companyName: string | null;

  roleTitle: string | null;

  startsAt: Date;

  endsAt: Date | null;

  locationLabel: string | null;

  locationAddress: string | null;

  notes: string | null;

  cancelledAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
