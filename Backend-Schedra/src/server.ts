import { app } from "./app";
import { env } from "./config/env";
import { prepareBackend } from "./bootstrap";
import { closeRedis, startRedisSubscriber } from "./platform/redis/redis-runtime";

const startServer = async (): Promise<void> => {
  try {
    await prepareBackend();

    startRedisSubscriber();
    const server = app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}.`);
    });
    const shutdown = () => {
      void closeRedis();
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start backend.", error);
    process.exit(1);
  }
};

startServer();
