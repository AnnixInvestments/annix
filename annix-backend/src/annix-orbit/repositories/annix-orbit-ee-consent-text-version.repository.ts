import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitEeConsentTextVersion } from "../entities/annix-orbit-ee-consent-text-version.entity";

export abstract class AnnixOrbitEeConsentTextVersionRepository extends CrudRepository<AnnixOrbitEeConsentTextVersion> {
  abstract activeOpenEnded(now: Date): Promise<AnnixOrbitEeConsentTextVersion | null>;
  abstract activeAt(now: Date): Promise<AnnixOrbitEeConsentTextVersion | null>;
  abstract latestOpenEnded(): Promise<AnnixOrbitEeConsentTextVersion | null>;
}
