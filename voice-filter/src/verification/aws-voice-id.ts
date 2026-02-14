import {
  CreateDomainCommand,
  DeleteDomainCommand,
  DescribeDomainCommand,
  DescribeSpeakerCommand,
  DescribeSpeakerEnrollmentJobCommand,
  type DomainSummary,
  EvaluateSessionCommand,
  ListDomainsCommand,
  OptOutSpeakerCommand,
  type SpeakerEnrollmentJob,
  StartSpeakerEnrollmentJobCommand,
  VoiceIDClient,
} from "@aws-sdk/client-voice-id";

export interface VoiceIDConfig {
  region?: string;
  domainId?: string;
}

export class AWSVoiceIDClient {
  private client: VoiceIDClient;
  private domainId: string | null = null;

  constructor(config: VoiceIDConfig = {}) {
    this.client = new VoiceIDClient({
      region: config.region ?? "us-east-1",
    });
    this.domainId = config.domainId ?? null;
  }

  async listDomains(): Promise<DomainSummary[]> {
    const response = await this.client.send(new ListDomainsCommand({}));
    return response.DomainSummaries ?? [];
  }

  async createDomain(name: string, description?: string): Promise<string> {
    const response = await this.client.send(
      new CreateDomainCommand({
        Name: name,
        Description: description ?? `Voice filter domain: ${name}`,
        ServerSideEncryptionConfiguration: {
          KmsKeyId: "alias/aws/voiceid",
        },
      }),
    );
    const domainId = response.Domain?.DomainId;
    if (!domainId) {
      throw new Error("Failed to create domain: no domain ID returned");
    }
    this.domainId = domainId;
    return domainId;
  }

  async describeDomain(domainId: string): Promise<DomainSummary | null> {
    const response = await this.client.send(new DescribeDomainCommand({ DomainId: domainId }));
    return response.Domain ?? null;
  }

  async deleteDomain(domainId: string): Promise<void> {
    await this.client.send(new DeleteDomainCommand({ DomainId: domainId }));
  }

  async ensureDomain(name: string): Promise<string> {
    const domains = await this.listDomains();
    const existing = domains.find((d) => d.Name === name);
    if (existing?.DomainId) {
      this.domainId = existing.DomainId;
      return existing.DomainId;
    }
    return this.createDomain(name);
  }

  setDomainId(domainId: string): void {
    this.domainId = domainId;
  }

  domainIdValue(): string | null {
    return this.domainId;
  }

  async startEnrollmentJob(params: {
    dataAccessRoleArn: string;
    inputS3Uri: string;
    outputS3Uri: string;
  }): Promise<SpeakerEnrollmentJob | null> {
    if (!this.domainId) {
      throw new Error("Domain ID not set");
    }
    const response = await this.client.send(
      new StartSpeakerEnrollmentJobCommand({
        DomainId: this.domainId,
        DataAccessRoleArn: params.dataAccessRoleArn,
        InputDataConfig: {
          S3Uri: params.inputS3Uri,
        },
        OutputDataConfig: {
          S3Uri: params.outputS3Uri,
        },
        EnrollmentConfig: {
          ExistingEnrollmentAction: "OVERWRITE",
          FraudDetectionConfig: {
            FraudDetectionAction: "IGNORE",
          },
        },
      }),
    );
    return response.Job ?? null;
  }

  async describeEnrollmentJob(jobId: string): Promise<SpeakerEnrollmentJob | null> {
    if (!this.domainId) {
      throw new Error("Domain ID not set");
    }
    const response = await this.client.send(
      new DescribeSpeakerEnrollmentJobCommand({
        DomainId: this.domainId,
        JobId: jobId,
      }),
    );
    return response.Job ?? null;
  }

  async describeSpeaker(speakerId: string): Promise<{
    speakerId: string;
    status: string;
  } | null> {
    if (!this.domainId) {
      throw new Error("Domain ID not set");
    }
    const response = await this.client.send(
      new DescribeSpeakerCommand({
        DomainId: this.domainId,
        SpeakerId: speakerId,
      }),
    );
    if (!response.Speaker) {
      return null;
    }
    return {
      speakerId: response.Speaker.CustomerSpeakerId ?? speakerId,
      status: response.Speaker.Status ?? "UNKNOWN",
    };
  }

  async evaluateSession(sessionId: string): Promise<{
    authenticationResult: {
      decision: string;
      score: number;
    } | null;
    fraudDetectionResult: {
      decision: string;
      riskScore: number;
    } | null;
  }> {
    if (!this.domainId) {
      throw new Error("Domain ID not set");
    }
    const response = await this.client.send(
      new EvaluateSessionCommand({
        DomainId: this.domainId,
        SessionNameOrId: sessionId,
      }),
    );

    return {
      authenticationResult: response.AuthenticationResult
        ? {
            decision: response.AuthenticationResult.Decision ?? "NOT_ENOUGH_SPEECH",
            score: response.AuthenticationResult.Score ?? 0,
          }
        : null,
      fraudDetectionResult: response.FraudDetectionResult
        ? {
            decision: response.FraudDetectionResult.Decision ?? "NOT_ENOUGH_SPEECH",
            riskScore:
              (response.FraudDetectionResult.Reasons?.[0]?.toString() ?? "0")
                ? parseFloat(response.FraudDetectionResult.Reasons?.[0]?.toString() ?? "0")
                : 0,
          }
        : null,
    };
  }

  async optOutSpeaker(speakerId: string): Promise<void> {
    if (!this.domainId) {
      throw new Error("Domain ID not set");
    }
    await this.client.send(
      new OptOutSpeakerCommand({
        DomainId: this.domainId,
        SpeakerId: speakerId,
      }),
    );
  }
}
