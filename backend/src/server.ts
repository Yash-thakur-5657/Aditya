import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import http from "node:http";
import { WebSocketServer } from "ws";
import { config, assertProductionConfig } from "./config";
import { logger } from "./utils/logger";
import { seedIfEmpty } from "./db/seed";
import { voiceRouter } from "./routes/voice";
import { propertiesRouter } from "./routes/api/properties";
import { leadsRouter } from "./routes/api/leads";
import { callsRouter } from "./routes/api/calls";
import { analyticsRouter } from "./routes/api/analytics";
import { statusRouter } from "./routes/api/status";
import { handleMediaStreamConnection } from "./websocket/mediaStream";
import { handleTestWidgetConnection } from "./websocket/testWidget";

seedIfEmpty();

const missing = assertProductionConfig();
if (missing.length > 0) {
  logger.warn({ missing }, "Starting with missing production config - some features will be degraded");
}

const app = express();
app.use(pinoHttp({ logger }));
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Twilio webhooks post form-encoded bodies

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/voice", voiceRouter);
app.use("/api/properties", propertiesRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/calls", callsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/status", statusRouter);

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "internal_error" });
});

const server = http.createServer(app);

const mediaStreamWss = new WebSocketServer({ noServer: true });
mediaStreamWss.on("connection", handleMediaStreamConnection);

const testWidgetWss = new WebSocketServer({ noServer: true });
testWidgetWss.on("connection", handleTestWidgetConnection);

server.on("upgrade", (request, socket, head) => {
  const { pathname } = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (pathname === "/media-stream") {
    mediaStreamWss.handleUpgrade(request, socket, head, (ws) => {
      mediaStreamWss.emit("connection", ws, request);
    });
  } else if (pathname === "/test-widget") {
    testWidgetWss.handleUpgrade(request, socket, head, (ws) => {
      testWidgetWss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(config.port, () => {
  logger.info(`Realty voice agent backend listening on port ${config.port}`);
});
