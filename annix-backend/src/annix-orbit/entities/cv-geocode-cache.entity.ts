import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("cv_assistant_geocode_cache")
export class CvGeocodeCache {
  @PrimaryColumn({ name: "address", type: "varchar", length: 500 })
  address: string;

  @Column({ name: "lat", type: "double precision" })
  lat: number;

  @Column({ name: "lon", type: "double precision" })
  lon: number;

  @Column({ name: "provider", type: "varchar", length: 50, default: "google" })
  provider: string;

  @CreateDateColumn({ name: "geocoded_at" })
  geocodedAt: Date;
}
