import { CrudRepository } from "../lib/persistence/crud-repository";
import { TeacherAssistantUser } from "./entities/teacher-assistant-user.entity";

export abstract class TeacherAssistantUserRepository extends CrudRepository<TeacherAssistantUser> {
  abstract findByEmail(email: string): Promise<TeacherAssistantUser | null>;
  abstract findAllOrderedById(): Promise<TeacherAssistantUser[]>;
}
