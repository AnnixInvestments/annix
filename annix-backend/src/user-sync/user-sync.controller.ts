import { Body, Controller, Headers, Logger, Post, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User } from "../user/entities/user.entity";
import { UserRepository } from "../user/user.repository";

class SyncUserDto {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  status: string;
}

@Controller("internal/user-sync")
export class UserSyncController {
  private readonly logger = new Logger(UserSyncController.name);
  private readonly syncKey: string | null;

  constructor(
    private readonly userRepo: UserRepository,
    private readonly configService: ConfigService,
  ) {
    this.syncKey = this.configService.get<string>("PEER_SYNC_KEY") ?? null;
  }

  @Post()
  async receiveSync(
    @Body() dto: SyncUserDto,
    @Headers("x-sync-key") providedKey: string,
  ): Promise<{ action: string; userId: number }> {
    if (!this.syncKey || providedKey !== this.syncKey) {
      throw new UnauthorizedException("Invalid sync key");
    }

    const existing = await this.userRepo.findOneByEmail(dto.email);

    if (existing) {
      this.logger.log(`User ${dto.email} already exists, skipping sync`);
      return { action: "already_exists", userId: existing.id };
    }

    const saved = await this.userRepo.create({
      email: dto.email,
      firstName: dto.firstName ?? undefined,
      lastName: dto.lastName ?? undefined,
      username: dto.username ?? dto.email,
      status: dto.status || "active",
    } as Partial<User>);
    this.logger.log(`User ${dto.email} created via peer sync (id: ${saved.id})`);

    return { action: "created", userId: saved.id };
  }
}
