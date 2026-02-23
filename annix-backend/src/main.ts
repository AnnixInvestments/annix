import * as path from "node:path";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
  app.useStaticAssets(uploadDir, { prefix: "/api/files/" });

  const isProduction = process.env.NODE_ENV === "production";
  const corsOrigins = [
    ...(isProduction ? [] : ["http://localhost:3000", "http://localhost:3001"]),
    ...(process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()) ?? []),
    process.env.FRONTEND_URL,
  ].filter((o): o is string => typeof o === "string" && o.startsWith("http"));

  app.enableCors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "x-device-fingerprint"],
    exposedHeaders: ["Content-Disposition"],
    credentials: true,
  });

  // Add security headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.removeHeader("X-Powered-By"); // Hide Express/NestJS signature
    next();
  });

  // Enable global validation (checks DTOs automatically)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove unknown properties
      forbidNonWhitelisted: true, // throw error if extra fields
      transform: true, // auto-transform payloads to DTO instances
    }),
  );

  // swagger configuration
  const config = new DocumentBuilder()
    .setTitle("Annix API")
    .setDescription("API documentation")
    .setVersion("1.0")
    .addBearerAuth() // optional, if using JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("swagger", app, document);

  await app.listen(process.env.PORT ?? 4001);
}
bootstrap();
