import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { EducationConsent } from "../entities/education-consent.entity";
import { EducationConsentRepository } from "./education-consent.repository";

@Injectable()
export class PostgresEducationConsentRepository
  extends TypeOrmCrudRepository<EducationConsent>
  implements EducationConsentRepository
{
  constructor(@InjectRepository(EducationConsent) repository: Repository<EducationConsent>) {
    super(repository);
  }

  activeForProfile(educationProfileId: string): Promise<EducationConsent | null> {
    return this.repository.findOne({ where: { educationProfileId, revokedAt: IsNull() } });
  }

  async revokeActiveForProfile(educationProfileId: string, revokedAt: Date): Promise<number> {
    const result = await this.repository.update(
      { educationProfileId, revokedAt: IsNull() },
      { revokedAt },
    );
    return result.affected ?? 0;
  }
}
