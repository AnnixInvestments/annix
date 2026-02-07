// export class FittingBore {}
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { FittingVariant } from "../../fitting-variant/entities/fitting-variant.entity";
import { NominalOutsideDiameterMm } from "../../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";

@Entity("fitting_bores")
export class FittingBore {
  @PrimaryGeneratedColumn({ name: "fitting_bore_id" })
  id: number;

  @Column({ name: "bore_position", type: "text" })
  borePositionName: string;

  @ManyToOne(
    () => NominalOutsideDiameterMm,
    (nominal) => nominal.fittingBores,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "nominal_outside_diameter_id" })
  nominalOutsideDiameter: NominalOutsideDiameterMm;

  @ManyToOne(
    () => FittingVariant,
    (variant) => variant.bores,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "fitting_variant_id" })
  variant: FittingVariant;
}
