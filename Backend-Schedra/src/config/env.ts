import dotenv from "dotenv";

dotenv.config();

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsedValue = Number(value);

  return Number.isNaN(parsedValue) ? fallback : parsedValue;
};

const normalizeString = (value: string | undefined, fallback: string): string => {
  if (value === undefined) {
    return fallback;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return fallback;
  }

  return trimmedValue.replace(/^['"]|['"]$/g, "");
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalizedValue)) {
    return false;
  }

  return fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: toNumber(process.env.PORT, 3333),
  frontendUrl: normalizeString(process.env.FRONTEND_URL, "http://localhost:5173"),
  timeZone: normalizeString(process.env.APP_TIMEZONE, "America/Sao_Paulo"),
  database: {
    dialect: normalizeString(process.env.DB_DIALECT, "postgres"),
    url: normalizeString(process.env.DATABASE_URL, ""),
    host: normalizeString(process.env.DB_HOST, ""),
    port: toNumber(process.env.DB_PORT, process.env.DB_DIALECT === "mysql" ? 3306 : 5432),
    name: normalizeString(process.env.DB_NAME, ""),
    user: normalizeString(process.env.DB_USER, ""),
    password: normalizeString(process.env.DB_PASSWORD, ""),
    ssl: toBoolean(process.env.DB_SSL, false),
    autoSync: toBoolean(process.env.DB_AUTO_SYNC, process.env.NODE_ENV !== "production"),
  },
  authSeedUser: {
    name: normalizeString(process.env.AUTH_USER_NAME, "Administrador Schedra"),
    email: normalizeString(process.env.AUTH_USER_EMAIL, "admin@schedra.app"),
    cpf: normalizeString(process.env.AUTH_USER_CPF, "52998224725"),
    password: normalizeString(process.env.AUTH_USER_PASSWORD, "123456"),
  },
  authSeedEnabled: toBoolean(process.env.AUTH_SEED_ENABLED, process.env.NODE_ENV !== "production"),
  jwt: {
    secret: normalizeString(process.env.JWT_SECRET, "schedra_jwt_secret"),
    expiresIn: normalizeString(process.env.JWT_EXPIRES_IN, "15m"),
    refreshDays: toNumber(process.env.JWT_REFRESH_DAYS, 30),
  },
  rateLimit: {
    windowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    maxRequests: toNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 240),
    authMaxRequests: toNumber(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 20),
  },
  metricsToken: normalizeString(process.env.METRICS_TOKEN, ""),
  redis: {
    url: normalizeString(process.env.REDIS_URL, ""),
    prefix: normalizeString(process.env.REDIS_PREFIX, "schedra:v1").replace(/[^a-zA-Z0-9:_-]/g, "_"),
    timeoutMs: Math.min(2000, Math.max(50, toNumber(process.env.REDIS_TIMEOUT_MS, 150))),
    ttlSeconds: Math.trunc(Math.min(300, Math.max(1, toNumber(process.env.REDIS_CACHE_TTL_SECONDS, 30)))),
    failureThreshold: 3,
    cooldownMs: 5000,
  },
};

export const assertProductionEnvironment = (): void => {
  if (env.nodeEnv !== "production") {
    return;
  }

  const unsafeValues = [
    "schedra_jwt_secret",
    "123456",
    "change_this_long_random_jwt_secret",
    "change_seed_password",
    "change_this_private_metrics_token",
  ];

  if (env.jwt.secret.length < 32 || unsafeValues.includes(env.jwt.secret)) {
    throw new Error("JWT_SECRET must be a unique secret with at least 32 characters in production.");
  }

  if (env.authSeedEnabled && (unsafeValues.includes(env.authSeedUser.password) || env.authSeedUser.password.length < 10)) {
    throw new Error("AUTH_USER_PASSWORD must be changed before running in production.");
  }

  if (!env.database.url && !(env.database.host && env.database.name && env.database.user && env.database.password)) {
    throw new Error("A database connection is required in production.");
  }

  if (!env.frontendUrl.startsWith("https://")) {
    throw new Error("FRONTEND_URL must use HTTPS in production.");
  }

  if (env.metricsToken.length < 24 || unsafeValues.includes(env.metricsToken)) {
    throw new Error("METRICS_TOKEN must contain at least 24 characters in production.");
  }
};
