import { Request, Response } from "express";
import { database } from "../config/database";
import { env } from "../config/env";
import { renderPrometheusMetrics } from "../shared/http/metrics";

export class HealthController {
  public check(_request: Request, response: Response): Response {
    return response.status(200).json({
      message: "API do Schedra em execução.",
      status: "ok",
      release: process.env.SCHEDRA_RELEASE || "development",
    });
  }

  public async ready(_request: Request, response: Response): Promise<Response> {
    const ready = await database.ping();
    return response.status(ready ? 200 : 503).json({
      message: ready ? "API e banco de dados disponíveis." : "Banco de dados indisponível.",
      status: ready ? "ready" : "unavailable",
    });
  }

  public metrics(request: Request, response: Response): Response {
    if (env.metricsToken) {
      const authorization = request.header("authorization");
      if (authorization !== `Bearer ${env.metricsToken}`) {
        return response.status(401).json({ message: "Token de métricas inválido." });
      }
    }

    return response
      .status(200)
      .type("text/plain; version=0.0.4; charset=utf-8")
      .send(renderPrometheusMetrics());
  }
}

