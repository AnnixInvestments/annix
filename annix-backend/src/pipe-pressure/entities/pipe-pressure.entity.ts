// export class PipePressure {}
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { PipeDimension } from '../../pipe-dimension/entities/pipe-dimension.entity';

@Entity('pipe_pressures')
export class PipePressure {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'float', nullable: true })
  temperature_c: number | null;

  @Column({ type: 'float', nullable: true })
  max_working_pressure_mpa: number | null;

  @Column({ type: 'float', nullable: false })
  allowable_stress_mpa: number;

  @ManyToOne(() => PipeDimension, (dimension) => dimension.pressures, {
    onDelete: 'CASCADE',
  })
  pipeDimension: PipeDimension;
}
