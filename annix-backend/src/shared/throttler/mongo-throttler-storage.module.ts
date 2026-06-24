import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MongoThrottlerStorage } from "./mongo-throttler-storage";
import { ThrottlerHitSchema } from "./throttler-hit.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: "ThrottlerHit", schema: ThrottlerHitSchema }])],
  providers: [MongoThrottlerStorage],
  exports: [MongoThrottlerStorage],
})
export class MongoThrottlerStorageModule {}
