import { Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { FittingType } from "../../fitting-type/entities/fitting-type.entity";
import { FittingVariant } from "../../fitting-variant/entities/fitting-variant.entity";
import { SteelSpecification } from "../../steel-specification/entities/steel-specification.entity";

@Entity("fittings")
export class Fitting {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => SteelSpecification,
    (steelSpecification) => steelSpecification.fittings,
    { eager: true },
  )
  @JoinColumn({ name: "steel_specification_id" })
  steelSpecification: SteelSpecification;

  @ManyToOne(
    () => FittingType,
    (type) => type.fittings,
    { eager: true },
  )
  @JoinColumn({ name: "fitting_type_id" })
  fittingType: FittingType;

  @OneToMany(
    () => FittingVariant,
    (variant) => variant.fitting,
    {
      cascade: true,
      eager: true,
    },
  )
  variants: FittingVariant[];
}
