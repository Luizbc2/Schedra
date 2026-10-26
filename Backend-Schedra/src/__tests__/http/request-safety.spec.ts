import express from "express";
import request from "supertest";

import { createRateLimiter } from "../../shared/http/rate-limit.middleware";
import { requestContextMiddleware } from "../../shared/http/request-context";
import { securityHeaders } from "../../shared/http/security.middleware";
import { errorEnvelopeMiddleware } from "../../shared/http/error.middleware";
import {
  renderPrometheusMetrics,
  requestMetricsMiddleware,
  resetMetricsForTests,
} from "../../shared/http/metrics";

describe("HTTP safety middleware", () => {
  const buildApp = () => {
    const app = express();
    app.use(requestContextMiddleware);
    app.use(errorEnvelopeMiddleware);
    app.use(requestMetricsMiddleware);
    app.use(securityHeaders);
    app.use(createRateLimiter({ windowMs: 60_000, maxRequests: 2 }));
    app.get("/resource", (_request, response) => response.status(200).json({ ok: true }));
    app.get("/resource/:id", (_request, response) => response.status(200).json({ ok: true }));
    app.get("/invalid", (_request, response) => response.status(400).json({ message: "Entrada inválida." }));
    return app;
  };

  it("propaga o identificador de correlação e cabeçalhos defensivos", async () => {
    const response = await request(buildApp()).get("/resource").set("x-request-id", "request-test-1");
    expect(response.headers["x-request-id"]).toBe("request-test-1");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("padroniza erros esperados que saem diretamente dos controladores", async () => {
    const response = await request(buildApp()).get("/invalid");
    expect(response.body).toMatchObject({ code: "BAD_REQUEST", message: "Entrada inválida." });
    expect(response.body.requestId).toBeTruthy();
  });

  it("limita excesso de requisições com erro rastreável", async () => {
    const app = buildApp();
    await request(app).get("/resource");
    await request(app).get("/resource");
    const response = await request(app).get("/resource");
    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({ code: "RATE_LIMITED" });
    expect(response.body.requestId).toBeTruthy();
  });

  it("expõe contadores sem transformar ids em rótulos de alta cardinalidade", async () => {
    resetMetricsForTests();
    const app = buildApp();
    await request(app).get("/resource/123");
    const metrics = renderPrometheusMetrics();
    expect(metrics).toContain('route="/resource/:id"');
    expect(metrics).toContain("schedra_http_requests_total");
    expect(metrics).toContain('schedra_http_request_duration_seconds_bucket{method="GET",route="/resource/:id",status="200",le="+Inf"} 1');
    await request(app).get("/path-with-sensitive-input");
    const unmatched = renderPrometheusMetrics();
    expect(unmatched).not.toContain("path-with-sensitive-input");
    expect(unmatched).toContain('route="_unmatched"');
  });
});
