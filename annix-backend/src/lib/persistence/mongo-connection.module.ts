import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ORBIT_CONNECTION } from "./mongo-connections";

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
    MongooseModule.forRootAsync({
      connectionName: ORBIT_CONNECTION,
      useFactory: () => {
        const uri = process.env.ORBIT_MONGODB_URI ?? process.env.MONGODB_URI;
        if (!uri) {
          throw new Error(
            "ORBIT_MONGODB_URI or MONGODB_URI is required when DATABASE_DRIVER is mongo",
          );
        }
        const dbName = process.env.ORBIT_MONGO_DATABASE ?? process.env.MONGO_DATABASE;
        if (!dbName) {
          throw new Error(
            "ORBIT_MONGO_DATABASE or MONGO_DATABASE is required when DATABASE_DRIVER is mongo",
          );
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
