import "reflect-metadata";
import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { hotlinkGuard } from "./media/hotlink-guard";
import { uploadsDir } from "./media/uploads";
import {
  AllExceptionsFilter,
  logJson,
  requestLogger,
} from "./logging/observability";

const DEV_TOKEN = "dev-admin-token";

function corsOrigins(): string[] {
  const defaults = ["http://localhost:3000", "http://localhost:3001"];
  const extra = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // The canonical site origin browses and embeds the API's media, so it is
  // always allowed — for CORS and for the /uploads hotlink guard alike.
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  return [...new Set([...defaults, ...extra, ...(site ? [site] : [])])];
}

async function bootstrap() {
  // Refuse to boot publicly with the documented dev credential. An empty
  // value is treated as missing too: `ADMIN_API_TOKEN=` must never slip past.
  const adminToken = process.env.ADMIN_API_TOKEN?.trim();
  if (
    process.env.NODE_ENV === "production" &&
    (!adminToken || adminToken === DEV_TOKEN)
  ) {
    throw new Error(
      "Refusing to start: set a strong ADMIN_API_TOKEN bootstrap credential " +
        "(e.g. `openssl rand -hex 32`). The dev default must never run in production.",
    );
  }
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    throw new Error(
      "Refusing to start: DATABASE_URL is required in production.",
    );
  }

  const origins = corsOrigins();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ["warn", "error"],
    // Article HTML can exceed body-parser's 100 kB default; register explicit
    // limits below instead of turning a long feature into a 500.
    bodyParser: false,
    cors: {
      origin: origins,
      methods: ["GET", "POST", "PATCH", "PUT", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-admin-token",
        "x-request-id",
      ],
      exposedHeaders: ["x-request-id"],
      credentials: false,
      maxAge: 86400,
    },
  });
  // Drop the Express fingerprint header.
  const server = app.getHttpAdapter().getInstance() as {
    disable?: (s: string) => void;
    set?: (key: string, value: unknown) => void;
  };
  server.disable?.("x-powered-by");

  app.useBodyParser("json", { limit: "2mb" });
  app.useBodyParser("urlencoded", { extended: true, limit: "2mb" });

  // req.ip must be the real reader behind a reverse proxy, otherwise the
  // throttler puts every reader in one bucket. Set TRUST_PROXY to the hop
  // count (e.g. 1) or a subnet/IP list in production; leave unset when the
  // API is exposed directly.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    server.set?.(
      "trust proxy",
      /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy,
    );
  }

  // Structured request logs (one JSON line per request, x-request-id).
  app.use(requestLogger());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  // Hotlink guard mirrors the web app's /_next/image policy for originals.
  app.use("/uploads", hotlinkGuard(origins));
  app.useStaticAssets(uploadsDir(), {
    prefix: "/uploads/",
    // Uploads are images; never let a browser sniff one into an active type.
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  });
  // Close the Postgres pool on SIGTERM/SIGINT instead of dropping connections.
  app.enableShutdownHooks();
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  logJson("info", "api listening", {
    port,
    health: `/api/v1/health`,
    mediaDriver: process.env.MEDIA_DRIVER ?? "local",
  });
}

void bootstrap().catch((err) => {
  logJson("error", "api failed to start", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
