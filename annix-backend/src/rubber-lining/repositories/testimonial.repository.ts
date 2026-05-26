import { CrudRepository } from "../../lib/persistence/crud-repository";
import { Testimonial } from "../entities/testimonial.entity";

export abstract class TestimonialRepository extends CrudRepository<Testimonial> {
  abstract build(data: Partial<Testimonial>): Testimonial;
  abstract findPublishedOrdered(): Promise<Testimonial[]>;
  abstract findAllOrdered(): Promise<Testimonial[]>;
}
