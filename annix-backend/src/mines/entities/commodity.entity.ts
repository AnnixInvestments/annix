import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { SaMine } from './sa-mine.entity';
import { SlurryProfile } from './slurry-profile.entity';

@Entity('commodities')
export class Commodity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'commodity_name', type: 'varchar', length: 100, unique: true })
  commodityName: string;

  @Column({ name: 'typical_process_route', type: 'text', nullable: true })
  typicalProcessRoute: string | null;

  @Column({ name: 'application_notes', type: 'text', nullable: true })
  applicationNotes: string | null;

  @OneToMany(() => SaMine, (mine) => mine.commodity)
  mines: SaMine[];

  @OneToMany(() => SlurryProfile, (profile) => profile.commodity)
  slurryProfiles: SlurryProfile[];
}
