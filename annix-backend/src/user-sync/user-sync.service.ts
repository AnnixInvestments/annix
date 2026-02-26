import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface SyncUserPayload {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  status: string;
}

@Injectable()
export class UserSyncService {
  private readonly logger = new Logger(UserSyncService.name);
  private readonly peerUrl: string | null;
  private readonly syncKey: string | null;

  constructor(private readonly configService: ConfigService) {
    this.peerUrl = this.configService.get<string>("PEER_BACKEND_URL") ?? null;
    this.syncKey = this.configService.get<string>("PEER_SYNC_KEY") ?? null;
  }

  async syncUserToPeer(payload: SyncUserPayload): Promise<void> {
    if (!this.peerUrl || !this.syncKey) {
      this.logger.debug("User sync skipped: PEER_BACKEND_URL or PEER_SYNC_KEY not configured");
      return;
    }

    try {
      const response = await fetch(`${this.peerUrl}/internal/user-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sync-Key": this.syncKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const result = await response.json();
        this.logger.log(`User ${payload.email} synced to peer: ${result.action}`);
      } else {
        const errorText = await response.text();
        this.logger.error(
          `Failed to sync user ${payload.email} to peer: ${response.status} ${errorText}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to sync user ${payload.email} to peer: ${error.message}`);
    }
  }
}
