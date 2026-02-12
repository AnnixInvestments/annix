import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('bend_center_to_face')
@Index(['bendType', 'nominalBoreMm', 'degrees'], { unique: true })
export class BendCenterToFace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 10,
    comment: 'Bend type: 1.5D, 2D, 3D, or 5D'
  })
  bendType: string;

  @Column({
    type: 'integer',
    comment: 'Nominal bore in millimeters'
  })
  nominalBoreMm: number;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    comment: 'Bend angle in degrees'
  })
  degrees: number;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    comment: 'Center to face dimension in millimeters'
  })
  centerToFaceMm: number;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    comment: 'Radius for the bend type in millimeters'
  })
  radiusMm: number;

  @Column({
    type: 'decimal',
    precision: 6,
    scale: 4,
    comment: 'Radian value for the angle'
  })
  radians: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}