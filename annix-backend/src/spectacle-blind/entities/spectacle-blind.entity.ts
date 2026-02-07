import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("spectacle_blinds")
@Unique(["nps", "pressureClass"])
export class SpectacleBlind {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 10 })
  nps: string; // Nominal Pipe Size

  @Column({ type: "varchar", length: 10, name: "pressure_class" })
  pressureClass: string; // e.g., "150", "300", "600"

  @Column({ type: "decimal", precision: 8, scale: 3, name: "od_blind" })
  odBlind: number; // Outside diameter of blind portion

  @Column({ type: "decimal", precision: 8, scale: 3, name: "od_spacer" })
  odSpacer: number; // Outside diameter of spacer portion

  @Column({ type: "decimal", precision: 6, scale: 3, name: "thickness_blind" })
  thicknessBlind: number; // Thickness of blind portion

  @Column({ type: "decimal", precision: 6, scale: 3, name: "thickness_spacer" })
  thicknessSpacer: number; // Thickness of spacer portion

  @Column({ type: "decimal", precision: 6, scale: 3, name: "bar_width" })
  barWidth: number; // Width of connecting bar

  @Column({ type: "decimal", precision: 6, scale: 3, name: "bar_thickness" })
  barThickness: number; // Thickness of connecting bar

  @Column({ type: "decimal", precision: 8, scale: 3, name: "overall_length" })
  overallLength: number; // Total length of spectacle blind

  @Column({
    type: "decimal",
    precision: 6,
    scale: 3,
    name: "handle_length",
    nullable: true,
  })
  handleLength: number | null; // Handle/lifting lug length

  @Column({
    type: "decimal",
    precision: 8,
    scale: 2,
    name: "weight_kg",
    nullable: true,
  })
  weightKg: number | null; // Weight in kilograms
}
