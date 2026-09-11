import cors from "cors";
import express, { Express } from "express";
import path from "node:path";

import { env } from "./config/env";
import { getTemporaryPreviewOrigins } from "./config/preview-origins";
import { HealthController } from "./controllers/health.controller";
import { router } from "./routes";
import { requestContextMiddleware } from "./shared/http/request-context";
import { securityHeaders } from "./shared/http/security.middleware";
import { createRateLimiter } from "./shared/http/rate-limit.middleware";
import { errorEnvelopeMiddleware, errorHandler, notFoundHandler } from "./shared/http/error.middleware";
import { openApiDocument } from "./docs/openapi";
import { requestLoggingMiddleware } from "./shared/http/request-logging.middleware";
import { requestMetricsMiddleware } from "./shared/http/metrics";

const isProduction = process.env.NODE_ENV === "production";

const normalizeOrigin = (value: string): string => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  try {
    const { origin } = new URL(trimmedValue);
    return origin;
  } catch {
    return trimmedValue.replace(/\/+$/, "");
  }
};

const buildAllowedOrigins = (): string[] => {
  const configuredOrigin = normalizeOrigin(env.frontendUrl);

  if (!configuredOrigin) {
    return ["http://localhost:5173", "http://127.0.0.1:5173"];
  }

  const alternateOrigin = configuredOrigin.includes("localhost")
    ? configuredOrigin.replace("localhost", "127.0.0.1")
    : configuredOrigin.includes("127.0.0.1")
      ? configuredOrigin.replace("127.0.0.1", "localhost")
      : configuredOrigin;

  return Array.from(new Set([configuredOrigin, alternateOrigin]));
};

const isLocalDevelopmentOrigin = (origin: string): boolean => {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

const isPrivateNetworkOrigin = (origin: string): boolean => {
  try {
    const { hostname } = new URL(origin);

    if (/^10\./.test(hostname)) {
      return true;
    }

    if (/^192\.168\./.test(hostname)) {
      return true;
    }

    const match = hostname.match(/^172\.(\d+)\./);

    if (!match) {
      return false;
    }

    const secondOctet = Number(match[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  } catch {
    return false;
  }
};

export class App {
  public readonly server: Express;
  private readonly healthController: HealthController;

  constructor() {
    this.server = express();
    this.healthController = new HealthController();

    this.middlewares();
    this.routes();
  }

  private middlewares(): void {
    const allowedOrigins = buildAllowedOrigins();

    this.server.disable("x-powered-by");
    this.server.set("trust proxy", 1);
    this.server.use(requestContextMiddleware);
    this.server.use(errorEnvelopeMiddleware);
    this.server.use(requestMetricsMiddleware);
    this.server.use(requestLoggingMiddleware);
    this.server.use(securityHeaders);
    this.server.use(createRateLimiter({ windowMs: env.rateLimit.windowMs, maxRequests: env.rateLimit.maxRequests }));

    this.server.use(
      cors({
        credentials: true,
        origin(origin, callback) {
          if (!isProduction) {
            callback(null, true);
            return;
          }

          if (
            !origin ||
            allowedOrigins.includes(origin) ||
            getTemporaryPreviewOrigins().includes(origin) ||
            (!isProduction && (isLocalDevelopmentOrigin(origin) || isPrivateNetworkOrigin(origin)))
          ) {
            callback(null, true);
            return;
          }

          callback(new Error("CORS origin not allowed"));
        },
      })
    );
    this.server.use(express.json({ limit: "1mb" }));
    this.server.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  }

  private routes(): void {
    this.server.get("/", (request, response) => this.healthController.check(request, response));
    this.server.get("/health", (request, response) => this.healthController.check(request, response));
    this.server.get("/ready", (request, response) => this.healthController.ready(request, response));
    this.server.get("/metrics", (request, response) => this.healthController.metrics(request, response));
    this.server.get("/api/docs/openapi.json", (_request, response) => response.status(200).json(openApiDocument));
    this.server.use("/api/auth", createRateLimiter({ windowMs: env.rateLimit.windowMs, maxRequests: env.rateLimit.authMaxRequests }));
    this.server.use("/api", router);
    this.server.use(notFoundHandler);
    this.server.use(errorHandler);
  }
}

const application = new App();

export const app = application.server;
export default app;
