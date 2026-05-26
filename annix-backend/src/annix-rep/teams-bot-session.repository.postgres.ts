import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { TeamsBotSession, TeamsBotSessionStatus } from "./entities/teams-bot-session.entity";
import { TeamsBotSessionRepository } from "./teams-bot-session.repository";

@Injectable()
export class PostgresTeamsBotSessionRepository
  extends TypeOrmCrudRepository<TeamsBotSession>
  implements TeamsBotSessionRepository
{
  constructor(@InjectRepository(TeamsBotSession) repository: Repository<TeamsBotSession>) {
    super(repository);
  }

  findBySessionIdAndUser(sessionId: string, userId: number): Promise<TeamsBotSession | null> {
    return this.repository.findOne({ where: { sessionId, userId } });
  }

  findByCallId(callId: string): Promise<TeamsBotSession | null> {
    return this.repository.findOne({ where: { callId } });
  }

  findActiveByUser(userId: number): Promise<TeamsBotSession[]> {
    return this.repository.find({
      where: {
        userId,
        status: In([TeamsBotSessionStatus.JOINING, TeamsBotSessionStatus.ACTIVE]),
      },
      order: { createdAt: "DESC" },
    });
  }

  findHistoryByUser(userId: number, limit: number): Promise<TeamsBotSession[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }
}
