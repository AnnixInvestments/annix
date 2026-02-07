import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../user/entities/user.entity";

@Entity()
export class UserRole {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Role name", example: "admin" })
  @Column({ unique: true })
  name: string;

  @ManyToMany(
    () => User,
    (user) => user.roles,
  )
  users: User[];

  @ApiProperty({ description: "Creation date" })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
