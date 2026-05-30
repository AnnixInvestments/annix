import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
          throw new Error("MONGODB_URI is required when DATABASE_DRIVER is mongo");
        }
        const dbName = process.env.MONGO_DATABASE;
        if (!dbName) {
          throw new Error("MONGO_DATABASE is required when DATABASE_DRIVER is mongo");
        }
        return {
          uri,
          dbName,
          serverSelectionTimeoutMS: 30000,
          connectTimeoutMS: 30000,
          maxPoolSize: 10,
          autoCreate: false,
          autoIndex: false,
        };
      },
    }),
  ],
})
export class MongoConnectionModule {}
