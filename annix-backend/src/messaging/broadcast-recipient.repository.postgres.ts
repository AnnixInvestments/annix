import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Not, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { BroadcastRecipientRepository } from "./broadcast-recipient.repository";
import { BroadcastRecipient } from "./entities/broadcast-recipient.entity";

@Injectable()
export class PostgresBroadcastRecipientRepository
  extends TypeOrmCrudRepository<BroadcastRecipient>
  implements BroadcastRecipientRepository
{
  constructor(@InjectRepository(BroadcastRecipient) repository: Repository<BroadcastRecipient>) {
    super(repository);
  }

  findByBroadcastAndUser(broadcastId: number, userId: number): Promise<BroadcastRecipient | null> {
    return this.repository.findOne({ where: { broadcastId, userId } });
  }

  findByUser(userId: number): Promise<BroadcastRecipient[]> {
    return this.repository.find({
      where: { userId },
      select: ["broadcastId", "readAt"],
    });
  }

  countUnreadForUser(userId: number): Promise<number> {
    return this.repository.count({ where: { userId, readAt: IsNull() } });
  }

  countReadForBroadcast(broadcastId: number): Promise<number> {
    return this.repository.count({ where: { broadcastId, readAt: Not(IsNull()) } });
  }

  countEmailSentForBroadcast(broadcastId: number): Promise<number> {
    return this.repository.count({ where: { broadcastId, emailSentAt: Not(IsNull()) } });
  }

  async updateEmailSentAt(
    broadcastId: number,
    userIds: number[],
    emailSentAt: Date,
  ): Promise<void> {
    await this.repository.update({ broadcastId, userId: In(userIds) }, { emailSentAt });
  }
}
