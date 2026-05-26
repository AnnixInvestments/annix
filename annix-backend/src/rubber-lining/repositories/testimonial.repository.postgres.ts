import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { Testimonial } from "../entities/testimonial.entity";
import { TestimonialRepository } from "./testimonial.repository";

@Injectable()
export class PostgresTestimonialRepository
  extends TypeOrmCrudRepository<Testimonial>
  implements TestimonialRepository
{
  constructor(@InjectRepository(Testimonial) repository: Repository<Testimonial>) {
    super(repository);
  }

  build(data: Partial<Testimonial>): Testimonial {
    return this.repository.create(data as TypeOrmDeepPartial<Testimonial>);
  }

  findPublishedOrdered(): Promise<Testimonial[]> {
    return this.repository.find({
      where: { isPublished: true },
      order: { sortOrder: "ASC", datePublished: "DESC" },
    });
  }

  findAllOrdered(): Promise<Testimonial[]> {
    return this.repository.find({
      order: { sortOrder: "ASC", datePublished: "DESC" },
    });
  }
}
