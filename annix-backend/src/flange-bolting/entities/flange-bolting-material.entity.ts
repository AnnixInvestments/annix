import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('flange_bolting_materials')
@Unique(['materialGroup'])
export class FlangeBoltingMaterial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'material_group' })
  materialGroup: string; // e.g., "Carbon Steel A105 (Group 1.1)"

  @Column({ type: 'varchar', name: 'stud_spec' })
  studSpec: string; // e.g., "ASTM A193 Grade B7"

  @Column({ type: 'varchar', name: 'machine_bolt_spec' })
  machineBoltSpec: string; // e.g., "ASTM A307 Grade B or ASTM A449"

  @Column({ type: 'varchar', name: 'nut_spec' })
  nutSpec: string; // e.g., "ASTM A194 Grade 2H"

  @Column({ type: 'varchar', name: 'washer_spec' })
  washerSpec: string; // e.g., "ASTM F436"
}
