export const openapi = {
  openapi: '3.1.0',
  info: { title: 'Schedra Event Activity', version: '1.0.0',
    description: 'API operacional do microsservico. Nao aceita JWT de usuario nem comandos de negocio.' },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: { operatorToken: { type: 'http', scheme: 'bearer',
      description: 'EVENTS_METRICS_TOKEN dedicado, diferente do token de usuario e de metricas da API.' } },
    schemas: {
      Activity: { type: 'object', required: ['items'], properties: {
        items: { type: 'array', items: { type: 'object', required: ['type', 'count'],
          properties: { type: { enum: ['client.created', 'client.updated', 'client.deleted'] },
            count: { type: 'integer', minimum: 0 } } } },
      } },
    },
  },
  paths: {
    '/health': { get: { summary: 'Liveness do processo', responses: {
      '200': { description: 'service, status=alive e release; nao comprova assinatura Redis.' },
    } } },
    '/ready': { get: { summary: 'Assinante conectado e armazenamento disponivel', responses: {
      '200': { description: 'status=ready' }, '503': { description: 'status=unavailable' },
    } } },
    '/activity': { get: { summary: 'Totais persistentes por tipo de evento recebido',
      security: [{ operatorToken: [] }], responses: {
        '200': { description: 'Projecao cumulativa; nao garante ausencia de perda no Pub/Sub.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Activity' } } } },
        '401': { description: 'Token operacional ausente/invalido' },
        '503': { description: 'Armazenamento indisponivel' },
      } } },
    '/metrics': { get: { summary: 'Contadores do processo e gauge de assinatura Redis',
      security: [{ operatorToken: [] }], responses: {
        '200': { description: 'Exposicao Prometheus text/plain' },
        '401': { description: 'Token operacional ausente/invalido' },
      } } },
  },
} as const;
