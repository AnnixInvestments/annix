import { CrudRepository } from "../../lib/persistence/crud-repository";
import { DashboardPreference } from "../entities/dashboard-preference.entity";

export abstract class DashboardPreferenceRepository extends CrudRepository<DashboardPreference> {
  abstract findOneForUser(companyId: number, userId: number): Promise<DashboardPreference | null>;
}
