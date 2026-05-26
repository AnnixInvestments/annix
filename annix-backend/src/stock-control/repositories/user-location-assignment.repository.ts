import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { UserLocationAssignment } from "../entities/user-location-assignment.entity";

export abstract class UserLocationAssignmentRepository extends CrudRepository<UserLocationAssignment> {
  abstract buildMany(rows: DeepPartial<UserLocationAssignment>[]): UserLocationAssignment[];
  abstract saveMany(entities: UserLocationAssignment[]): Promise<UserLocationAssignment[]>;
  abstract findForCompanyWithRelations(companyId: number): Promise<UserLocationAssignment[]>;
  abstract findForUser(companyId: number, userId: number): Promise<UserLocationAssignment[]>;
  abstract deleteForUser(companyId: number, userId: number): Promise<void>;
}
