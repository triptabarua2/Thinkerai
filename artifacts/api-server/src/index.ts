import app from "./app";
import { logger } from "./lib/logger";
import { ensurePushTokensTable } from "./lib/db.js";

// Catch promise rejections that escape any try/catch block.
// Node.js v15+ crashes the process by default — this keeps the server alive
// and logs the problem instead.
process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled promise rejection — server kept alive");
});

// Catch synchronous exceptions that escape all error boundaries.
// Log and exit cleanly so the process manager (e.g. Replit workflow) can restart.
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — forcing clean exit");
  process.exit(1);
});

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Ensure push_tokens table exists (idempotent, non-blocking)
ensurePushTokensTable().catch((err) => {
  logger.warn({ err }, "push_tokens table setup failed — push notifications disabled");
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
