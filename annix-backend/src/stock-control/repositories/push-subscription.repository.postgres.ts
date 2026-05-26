import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { PushSubscription } from "../entities/push-subscription.entity";
import { PushSubscriptionRepository } from "./push-subscription.repository";

@Injectable()
export class PostgresPushSubscriptionRepository
  extends TypeOrmCrudRepository<PushSubscription>
  implements PushSubscriptionRepository
{
  constructor(@InjectRepository(PushSubscription) repository: Repository<PushSubscription>) {
    super(repository);
  }

  findByEndpoint(endpoint: string): Promise<PushSubscription | null> {
    return this.repository.findOne({
      where: { endpoint },
    });
  }

  findForUser(userId: number): Promise<PushSubscription[]> {
    return this.repository.find({ where: { userId } });
  }

  async deleteByUserAndEndpoint(userId: number, endpoint: string): Promise<void> {
    await this.repository.delete({ userId, endpoint });
  }

  async deleteByIds(ids: number[]): Promise<void> {
    await this.repository.delete(ids);
  }

  async deleteForCompany(companyId: number): Promise<void> {
    await this.repository.delete({ companyId });
  }
}
