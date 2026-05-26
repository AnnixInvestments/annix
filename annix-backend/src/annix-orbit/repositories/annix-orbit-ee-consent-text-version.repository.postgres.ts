import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, LessThan, MoreThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitEeConsentTextVersion } from "../entities/annix-orbit-ee-consent-text-version.entity";
import { AnnixOrbitEeConsentTextVersionRepository } from "./annix-orbit-ee-consent-text-version.repository";

@Injectable()
export class PostgresAnnixOrbitEeConsentTextVersionRepository
  extends TypeOrmCrudRepository<AnnixOrbitEeConsentTextVersion>
  implements AnnixOrbitEeConsentTextVersionRepository
{
  constructor(
    @InjectRepository(AnnixOrbitEeConsentTextVersion)
    repository: Repository<AnnixOrbitEeConsentTextVersion>,
  ) {
    super(repository);
  }

  activeOpenEnded(now: Date): Promise<AnnixOrbitEeConsentTextVersion | null> {
    return this.repository.findOne({
      where: [{ effectiveFrom: LessThan(now), effectiveTo: IsNull() }],
      order: { effectiveFrom: "DESC" },
    });
  }

  activeAt(now: Date): Promise<AnnixOrbitEeConsentTextVersion | null> {
    return this.repository.findOne({
      where: [
        { effectiveFrom: LessThan(now), effectiveTo: IsNull() },
        { effectiveFrom: LessThan(now), effectiveTo: MoreThan(now) },
      ],
      order: { effectiveFrom: "DESC" },
    });
  }

  latestOpenEnded(): Promise<AnnixOrbitEeConsentTextVersion | null> {
    return this.repository.findOne({
      where: { effectiveTo: IsNull() },
      order: { effectiveFrom: "DESC" },
    });
  }
}
