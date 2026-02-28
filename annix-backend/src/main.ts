import * as path from "node:path";
import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const isProduction = process.env.NODE_ENV === "production";

  app.setGlobalPrefix("api", {
    exclude: [{ path: "health", method: RequestMethod.GET }],
  });

  const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
  app.useStaticAssets(uploadDir, { prefix: "/api/files/" });

  const corsOrigins = [
    ...(isProduction ? [] : ["http://localhost:3000", "http://localhost:3001"]),
    ...(process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()) ?? []),
  ].filter((o): o is string => typeof o === "string" && o.startsWith("http"));

  app.enableCors({
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "x-device-fingerprint"],
    exposedHeaders: ["Content-Disposition"],
    credentials: true,
  });

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.removeHeader("X-Powered-By");
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Annix API")
    .setDescription("API documentation")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("swagger", app, document);

  if (isProduction) {
    const next = require("next");
    const frontendDir = path.resolve(__dirname, "..", "..", "..", "annix-frontend");
    const nextApp = next({ dev: false, dir: frontendDir });
    await nextApp.prepare();
    const nextHandler = nextApp.getRequestHandler();

    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.all("/{*path}", (req, res) => nextHandler(req, res));
  }

  await app.listen(process.env.PORT ?? 4001);
}
bootstrap();
