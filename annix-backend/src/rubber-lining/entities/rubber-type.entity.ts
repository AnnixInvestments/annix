import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { RubberSpecification } from "./rubber-specification.entity";

export enum RubberPolymerType {
  TYPE_1 = 1,
  TYPE_2 = 2,
  TYPE_3 = 3,
  TYPE_4 = 4,
  TYPE_5 = 5,
}

@Entity("rubber_types")
export class RubberType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "type_number", type: "int", unique: true })
  typeNumber: number;

  @Column({ name: "type_name", type: "varchar", length: 100 })
  typeName: string;

  @Column({ name: "polymer_codes", type: "varchar", length: 100 })
  polymerCodes: string;

  @Column({ name: "polymer_names", type: "varchar", length: 255 })
  polymerNames: string;

  @Column({ name: "description", type: "text" })
  description: string;

  @Column({ name: "temp_min_celsius", type: "decimal", precision: 5, scale: 1 })
  tempMinCelsius: number;

  @Column({ name: "temp_max_celsius", type: "decimal", precision: 5, scale: 1 })
  tempMaxCelsius: number;

  @Column({ name: "ozone_resistance", type: "varchar", length: 50 })
  ozoneResistance: string;

  @Column({ name: "oil_resistance", type: "varchar", length: 50 })
  oilResistance: string;

  @Column({ name: "chemical_resistance_notes", type: "text", nullable: true })
  chemicalResistanceNotes: string | null;

  @Column({ name: "not_suitable_for", type: "text", nullable: true })
  notSuitableFor: string | null;

  @Column({ name: "typical_applications", type: "text", nullable: true })
  typicalApplications: string | null;

  @OneToMany(
    () => RubberSpecification,
    (spec) => spec.rubberType,
  )
  specifications: RubberSpecification[];
}
