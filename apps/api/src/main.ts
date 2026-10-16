import "reflect-metadata";
import "dotenv/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { uploadsDir } from "./media/media.controller";

const DEV_TOKEN = "dev-admin-token";

function corsOrigins(): string[] {
  const defaults = ["http://localhost:3000", "http://localhost:3001"];
  const extra = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...defaults, ...extra])];
}

async function bootstrap() {
  // Refuse to boot publicly with the documented dev credential.
  if (process.env.NODE_ENV === "production" && (process.env.ADMIN_API_TOKEN ?? DEV_TOKEN) === DEV_TOKEN) {
    throw new Error(
      "Refusing to start: set a strong ADMIN_API_TOKEN (e.g. `openssl rand -hex 32`). " +
        "The dev default must never run in production.",
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: corsOrigins(),
      methods: ["GET", "POST", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-admin-token", "x-admin-user-id"],
      credentials: false,
      maxAge: 86400,
    },
  });
  // Drop the Express fingerprint header.
  const server = app.getHttpAdapter().getInstance() as { disable?: (s: string) => void };
  server.disable?.("x-powered-by");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useStaticAssets(uploadsDir(), { prefix: "/uploads/" });
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
  console.log(`API listening on http://localhost:${port} (health: /api/v1/health)`);
}

void bootstrap();
