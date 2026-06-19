export class VoiceProfile {
  id: number;

  userId: number;

  enrolled: boolean;

  awsSpeakerId: string | null;

  awsDomainId: string | null;

  enrolledAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
