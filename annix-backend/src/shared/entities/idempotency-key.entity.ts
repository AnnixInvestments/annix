export class IdempotencyKey {
  id: number;

  key: string;

  requestMethod: string;

  requestPath: string;

  responseStatus: number;

  responseBody: Record<string, unknown>;

  companyId: number;

  createdAt: Date;

  expiresAt: Date;
}
