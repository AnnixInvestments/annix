import "./load-env";
import { setDefaultResultOrder, setServers } from "node:dns";
import { setDefaultAutoSelectFamily } from "node:net";
import * as path from "node:path";
import { corsOriginsFor } from "@annix/product-data/portals";
import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { assertAnnixOrbitWhatsAppQuotaGateConfigured } from "./annix-orbit/annix-orbit-quota-gate.config";
import { AppModule } from "./app.module";
import { runMongoMigrationsOnBoot } from "./lib/persistence/run-mongo-migrations";
import { STARTUP_SPLASH_HTML } from "./lib/startup-splash";
import { assertProductionSecurityConfig } from "./shared/security/production-security.config";

setDefaultResultOrder("ipv4first");
setDefaultAutoSelectFamily(false);

// Opt-in DNS override for environments whose local resolver refuses Node's SRV
// queries (e.g. some VPNs break mongodb+srv:// lookups). Set MONGO_DNS_SERVERS
// to a comma list of public resolvers. Unset in prod, so prod is unaffected.
const mongoDnsServers = process.env.MONGO_DNS_SERVERS;
if (mongoDnsServers) {
  setServers(
    mongoDnsServers
      .split(",")
      .map((server) => server.trim())
      .filter(Boolean),
  );
}

async function bootstrap() {
  assertProductionSecurityConfig();
  assertAnnixOrbitWhatsAppQuotaGateConfigured();
  await runMongoMigrationsOnBoot();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    rawBody: true,
  });

  app.useBodyParser("json", { limit: "10mb" });
  app.useBodyParser("urlencoded", { limit: "10mb", extended: true });

  const isProduction = process.env.NODE_ENV === "production";

  app.setGlobalPrefix("api", {
    exclude: [{ path: "health", method: RequestMethod.GET }],
  });

  const portalOrigins = isProduction ? corsOriginsFor("prod") : corsOriginsFor("dev");
  const corsOrigins = [
    ...portalOrigins,
    ...(isProduction ? [] : ["http://localhost:3001"]),
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
      const isPlainHttp = proto === "http";
      const isWebhookPath = req.path.startsWith("/api/stock-control/positector-streaming/webhook");

      if (isPlainHttp && !isWebhookPath) {
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

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Annix API")
      .setDescription("API documentation")
      .setVersion("1.0")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("swagger", app, document);
  }

  const port = process.env.PORT ?? 4001;

  if (isProduction) {
    const next = require("next");
    const frontendDir = path.resolve(__dirname, "..", "..", "annix-frontend");
    const nextApp = next({ dev: false, dir: frontendDir });

    // Register the Next.js catch-all BEFORE listening so it's in the
    // middleware chain ahead of NestJS's 404 handler. A ready flag gates
    // frontend requests until nextApp.prepare() finishes.
    let nextReady = false;
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use((req, res, nextMiddleware) => {
      if (req.path.startsWith("/api") || req.path === "/health") {
        return nextMiddleware();
      }
      if (!nextReady) {
        res.status(503);
        res.setHeader("Retry-After", "3");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(STARTUP_SPLASH_HTML);
        return;
      }
      return nextApp.getRequestHandler()(req, res);
    });

    await app.listen(port, "0.0.0.0");

    // Prepare Next.js in the background — health check already passes.
    await nextApp.prepare();
    nextReady = true;
  } else {
    await app.listen(port, "0.0.0.0");
  }
}
bootstrap();
