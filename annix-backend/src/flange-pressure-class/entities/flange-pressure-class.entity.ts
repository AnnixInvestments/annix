import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { FlangeDimension } from "../../flange-dimension/entities/flange-dimension.entity";
import { FlangeStandard } from "../../flange-standard/entities/flange-standard.entity";

@Entity("flange_pressure_classes")
export class FlangePressureClass {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  designation: string; // e.g. "6/3", "10/3", "T/D"

  @Column({ type: "varchar", nullable: true })
  pressureCategory: string | null; // "Low Pressure", "Medium Pressure", "High Pressure" - auto-filled for BS 10

  @ManyToOne(
    () => FlangeStandard,
    (standard) => standard.id,
    {
      onDelete: "CASCADE",
    },
  )
  standard: FlangeStandard;

  @OneToMany(
    () => FlangeDimension,
    (flange) => flange.pressureClass,
  )
  flanges: FlangeDimension[];
}
