import * as path from "node:path";
import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.useBodyParser("json", { limit: "10mb" });
  app.useBodyParser("urlencoded", { limit: "10mb", extended: true });

  const isProduction = process.env.NODE_ENV === "production";

  app.setGlobalPrefix("api", {
    exclude: [{ path: "health", method: RequestMethod.GET }],
  });

  const storageType = process.env.STORAGE_TYPE || "s3";
  if (storageType.toLowerCase() === "local") {
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");
    app.useStaticAssets(uploadDir, { prefix: "/api/files/" });
  }

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

  if (isProduction) {
    app.use((req, res, next) => {
      const proto = req.headers["x-forwarded-proto"];
      const isHttps = proto === "https";
      const isWebhookPath = req.path.startsWith(
        "/api/stock-control/positector-streaming/webhook",
      );

      if (!isHttps && !isWebhookPath) {
        const host = req.headers.host ?? "";
        return res.redirect(301, `https://${host}${req.url}`);
      }

      return next();
    });
  }

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
    expressApp.use((req, res, next) => {
      if (
        req.path.startsWith("/api") ||
        req.path === "/health" ||
        req.path.startsWith("/swagger")
      ) {
        return next();
      }
      return nextHandler(req, res);
    });
  }

  const port = process.env.PORT ?? 4001;
  await app.listen(port, "0.0.0.0");
}
bootstrap();
