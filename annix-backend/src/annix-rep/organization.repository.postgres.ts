import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { Organization } from "./entities/organization.entity";
import { OrganizationRepository } from "./organization.repository";

@Injectable()
export class PostgresOrganizationRepository
  extends TypeOrmCrudRepository<Organization>
  implements OrganizationRepository
{
  constructor(@InjectRepository(Organization) repository: Repository<Organization>) {
    super(repository);
  }

  findBySlug(slug: string): Promise<Organization | null> {
    return this.repository.findOne({ where: { slug } });
  }

  findWithOwner(id: number): Promise<Organization | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["owner"],
    });
  }

  findBySlugWithOwner(slug: string): Promise<Organization | null> {
    return this.repository.findOne({
      where: { slug },
      relations: ["owner"],
    });
  }
}
