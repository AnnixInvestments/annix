import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { CvPushSubscription } from "../entities/cv-push-subscription.entity";
import { CvPushSubscriptionRepository } from "./cv-push-subscription.repository";

@Injectable()
export class PostgresCvPushSubscriptionRepository
  extends TypeOrmCrudRepository<CvPushSubscription>
  implements CvPushSubscriptionRepository
{
  constructor(@InjectRepository(CvPushSubscription) repository: Repository<CvPushSubscription>) {
    super(repository);
  }

  findByEndpoint(endpoint: string): Promise<CvPushSubscription | null> {
    return this.repository.findOne({ where: { endpoint } });
  }

  findByUser(userId: number): Promise<CvPushSubscription[]> {
    return this.repository.find({ where: { userId } });
  }

  countForUser(userId: number): Promise<number> {
    return this.repository.count({ where: { userId } });
  }

  async deleteByUserEndpoint(userId: number, endpoint: string): Promise<void> {
    await this.repository.delete({ userId, endpoint });
  }

  async deleteByIds(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await this.repository.delete({ id: In(ids) });
  }
}
