import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { DomainError } from '@finnapp/domain';
import { GetCashStatement, NotFoundError } from '../../application/GetCashStatement';
import type { LedgerReader } from '../../application/LedgerReader';

export interface AppDeps {
  ledger: LedgerReader;
  /** Quem está chamando. Autenticação de verdade entra aqui (token do app). */
  userFrom: (request: FastifyRequest) => string;
  logger?: boolean;
}

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({ logger: deps.logger ?? false });
  const getCashStatement = new GetCashStatement(deps.ledger);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof NotFoundError) return reply.code(404).send({ error: error.message });
    if (error instanceof DomainError) return reply.code(400).send({ error: error.message });
    const e = error as { validation?: unknown; message?: string };
    if (e.validation) return reply.code(400).send({ error: e.message ?? 'Requisição inválida' });
    app.log.error(error);
    return reply.code(500).send({ error: 'Erro interno' });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.get<{ Querystring: { from: string; to: string; account?: string } }>('/v1/cash-statement', {
    schema: {
      querystring: {
        type: 'object',
        required: ['from', 'to'],
        properties: { from: { type: 'string' }, to: { type: 'string' }, account: { type: 'string' } },
      },
    },
  }, async (request) => {
    const { from, to, account } = request.query;
    return getCashStatement.execute({ userId: deps.userFrom(request), from, to, ...(account ? { account } : {}) });
  });

  return app;
}
