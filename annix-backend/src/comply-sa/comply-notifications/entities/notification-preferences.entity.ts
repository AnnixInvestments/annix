import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("comply_sa_notification_preferences")
export class ComplySaNotificationPreferences {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "user_id", type: "int", unique: true })
  userId!: number;

  @Column({ name: "email_enabled", type: "boolean", default: true })
  emailEnabled!: boolean;

  @Column({ name: "sms_enabled", type: "boolean", default: false })
  smsEnabled!: boolean;

  @Column({ name: "whatsapp_enabled", type: "boolean", default: false })
  whatsappEnabled!: boolean;

  @Column({ name: "in_app_enabled", type: "boolean", default: true })
  inAppEnabled!: boolean;

  @Column({ name: "weekly_digest", type: "boolean", default: true })
  weeklyDigest!: boolean;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone!: string | null;
}
