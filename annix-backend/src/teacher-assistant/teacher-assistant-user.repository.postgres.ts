import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { TeacherAssistantUser } from "./entities/teacher-assistant-user.entity";
import { TeacherAssistantUserRepository } from "./teacher-assistant-user.repository";

@Injectable()
export class PostgresTeacherAssistantUserRepository
  extends TypeOrmCrudRepository<TeacherAssistantUser>
  implements TeacherAssistantUserRepository
{
  constructor(
    @InjectRepository(TeacherAssistantUser) repository: Repository<TeacherAssistantUser>,
  ) {
    super(repository);
  }

  findByEmail(email: string): Promise<TeacherAssistantUser | null> {
    return this.repository.findOne({ where: { email } });
  }

  findAllOrderedById(): Promise<TeacherAssistantUser[]> {
    return this.repository.find({ order: { id: "ASC" } });
  }
}
