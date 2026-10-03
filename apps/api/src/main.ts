import pg from 'pg';
import { buildApp } from './infra/http/app';
import { PostgresLedger } from './infra/postgres/PostgresLedger';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('Defina DATABASE_URL (veja .env.example)');

const pool = new pg.Pool({ connectionString: databaseUrl });
const app = buildApp({
  ledger: new PostgresLedger(pool),
  // Provisório até a autenticação: um usuário fixo por variável de ambiente.
  userFrom: () => process.env.FINNAPP_USER ?? 'local',
  logger: true,
});

const port = Number(process.env.PORT ?? 3333);
app.listen({ port, host: '0.0.0.0' }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
