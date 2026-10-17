/**
 * Structured logs, request correlation, and error reporting (Step 5).
 *
 * Every line is a single JSON object — ready for Loki/CloudWatch/Datadog.
 * Requests get an `x-request-id` (new or forwarded) that appears in the
 * completion log and on any 5xx report sent to ERROR_WEBHOOK_URL.
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function logJson(
  level: "info" | "warn" | "error",
  msg: string,
  fields: Record<string, unknown> = {},
) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "api",
    msg,
    ...fields,
  });
  if (level === "error") console.error(line);
  else console.log(line);
}

interface RequestWithId extends Request {
  reqId?: string;
}

/** One completion log line per request, correlated by x-request-id. */
export function requestLogger() {
  return (req: RequestWithId, res: Response, next: NextFunction) => {
    const incoming = req.headers["x-request-id"];
    const reqId =
      typeof incoming === "string" && incoming.length <= 128
        ? incoming
        : randomUUID();
    req.reqId = reqId;
    res.setHeader("x-request-id", reqId);
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const durMs = Number(process.hrtime.bigint() - start) / 1e6;
      const level =
        res.statusCode >= 500
          ? "error"
          : res.statusCode >= 400
            ? "warn"
            : "info";
      logJson(level, "http_request", {
        reqId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durMs: Math.round(durMs * 10) / 10,
        ip: req.ip,
      });
    });
    next();
  };
}

/** Fire-and-forget error report (Slack/generic webhook); never blocks a response. */
export async function reportError(
  payload: Record<string, unknown>,
): Promise<void> {
  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: "api",
        ts: new Date().toISOString(),
        ...payload,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* monitoring must never break request handling */
  }
}

/**
 * Global exception filter: "respond" doesn't mean "know off the platform".
 * 4xx is logged as a warn request line by the middleware; 5xx are logged in
 * detail here and pushed to the alert webhook.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<RequestWithId>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let body: Record<string, unknown> | string;
    if (isHttp) {
      const response = exception.getResponse();
      body =
        typeof response === "string"
          ? { statusCode: status, message: response }
          : (response as Record<string, unknown>);
    } else {
      const err = exception as Error;
      logJson("error", "unhandled_exception", {
        reqId: req.reqId,
        method: req.method,
        path: req.originalUrl,
        status,
        error: err?.message,
        stack: err?.stack?.split("\n").slice(0, 8).join(" | "),
      });
      void reportError({
        type: "api_error",
        reqId: req.reqId,
        method: req.method,
        path: req.originalUrl,
        status,
        error: err?.message,
        stack: err?.stack,
      });
      body = { statusCode: status, message: "Internal server error" };
    }
    res.status(status).json(body);
  }
}
