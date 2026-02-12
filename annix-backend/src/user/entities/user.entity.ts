import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, OneToMany, JoinTable } from 'typeorm';
import { UserRole } from '../../user-roles/entities/user-role.entity'
import { Rfq } from '../../rfq/entities/rfq.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@Entity()
export class User {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Unique username', example: 'john_doe' })
  @Column({ unique: true, nullable: true })
  username: string;

  @ApiProperty({ description: 'User email address', example: 'john@example.com' })
  @Column({ unique: true, nullable: true })
  email: string;

  @ApiProperty({ description: 'Hashed password (never expose in responses)' })
  @Exclude()
  @Column({ nullable: true })
  password: string;

  @ApiProperty({ description: 'Random salt used for password hashing' })
  @Exclude()
  @Column()
  salt: string;

  @ApiProperty({
    description: 'Roles assigned to the user',
    type: () => [UserRole],
  })
  @ManyToMany(() => UserRole, (role) => role.users, { eager: true })
  @JoinTable()
  roles: UserRole[];

  @ApiProperty({ description: 'RFQs created by this user', type: () => [Rfq] })
  @OneToMany(() => Rfq, (rfq) => rfq.createdBy, { lazy: true })
  rfqs: Promise<Rfq[]>;
}
