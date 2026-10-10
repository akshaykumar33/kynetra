import { buildApp } from './app';

const port = Number(process.env.PORT ?? 4000);
const app = buildApp();

app.listen({ port, host: '0.0.0.0' }).catch(err => {
  app.log.error(err);
  process.exit(1);
});
