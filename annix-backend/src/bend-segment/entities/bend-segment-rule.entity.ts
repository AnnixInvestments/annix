import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('bend_segment_rules')
@Unique(['bendRadiusType', 'angleRangeMin', 'angleRangeMax'])
export class BendSegmentRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'bend_radius_type', type: 'varchar', length: 20 })
  bendRadiusType: string;

  @Column({ name: 'angle_range_min', type: 'decimal', precision: 5, scale: 2 })
  angleRangeMin: number;

  @Column({ name: 'angle_range_max', type: 'decimal', precision: 5, scale: 2 })
  angleRangeMax: number;

  @Column({ name: 'min_segments', type: 'int' })
  minSegments: number;

  @Column({ name: 'max_segments', type: 'int' })
  maxSegments: number;

  @Column({ name: 'dimension_column', type: 'varchar', length: 1 })
  dimensionColumn: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;
}
