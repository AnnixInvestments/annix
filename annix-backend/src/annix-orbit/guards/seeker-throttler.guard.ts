import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

@Injectable()
export class SeekerThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as { id?: number } | undefined;
    if (user?.id != null) {
      return `seeker-user:${user.id}`;
    }
    const ip = req.ip as string | undefined;
    return ip ?? "seeker-user:unknown";
  }
}
