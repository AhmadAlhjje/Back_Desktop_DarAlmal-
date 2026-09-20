import { app } from './app.js';
import { env } from './config/env.js';
import { sequelize } from './infrastructure/database/sequelize/sequelize.js';
import { dependencies } from './container/dependencies.js';
async function start() {
  await sequelize.authenticate();
  dependencies.licenseMonitor.start();
  app.listen(env.PORT, () => console.info(`Wafeer API listening on port ${env.PORT}`));
}
start().catch((error) => {
  dependencies.logger.error(
    {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown startup error',
    },
    'Failed to start server',
  );
  process.exitCode = 1;
});
