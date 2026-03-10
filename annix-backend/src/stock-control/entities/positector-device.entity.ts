import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";
import { StockControlCompany } from "./stock-control-company.entity";

export enum PositectorProbeType {
  DFT_6000 = "6000",
  SPG = "SPG",
  SHD = "SHD",
  RTR = "RTR",
  DPM = "DPM",
  UTG = "UTG",
  AT = "AT",
}

@Entity("positector_devices")
@Unique(["companyId", "ipAddress"])
export class PositectorDevice {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "device_name", type: "varchar", length: 255 })
  deviceName: string;

  @Column({ name: "ip_address", type: "varchar", length: 45 })
  ipAddress: string;

  @Column({ name: "port", type: "integer", default: 8080 })
  port: number;

  @Column({ name: "probe_type", type: "varchar", length: 20, nullable: true })
  probeType: string | null;

  @Column({ name: "serial_number", type: "varchar", length: 100, nullable: true })
  serialNumber: string | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "last_connected_at", type: "timestamptz", nullable: true })
  lastConnectedAt: Date | null;

  @Column({ name: "registered_by_name", type: "varchar", length: 255 })
  registeredByName: string;

  @Column({ name: "registered_by_id", type: "integer", nullable: true })
  registeredById: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
