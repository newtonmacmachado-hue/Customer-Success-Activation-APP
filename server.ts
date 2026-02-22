import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./server/routes/auth.js";
import adminRouter from "./server/routes/admin.js";
import accountsRouter from "./server/routes/accounts.js";
import meetingsRouter from "./server/routes/meetings.js";
import opportunitiesRouter from "./server/routes/opportunities.js";
import successPlansRouter from "./server/routes/successPlans.js";
import activitiesRouter from "./server/routes/activities.js";
import healthRouter from "./server/routes/health.js";
import segmentsRouter from "./server/routes/segments.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { errorHandler } from "./server/utils/errorHandler.js";
import { requireAuth } from "./server/middleware/auth.js";

async function createServer() {
  const app = express();

  app.use(cors());
  app.use(bodyParser.json());

  // Public Routes
  app.use("/api/auth", authRouter);
  app.use("/api/health", healthRouter);

  // Protected Routes
  app.use("/api/admin", requireAuth, adminRouter);
  app.use("/api/accounts", requireAuth, accountsRouter);
  app.use("/api/meetings", requireAuth, meetingsRouter);
  app.use("/api/opportunities", requireAuth, opportunitiesRouter);
  app.use("/api/success-plans", requireAuth, successPlansRouter);
  app.use("/api/activities", requireAuth, activitiesRouter);
  app.use("/api/segments", requireAuth, segmentsRouter);

  // Error Handler Middleware (Must be last)
  app.use(errorHandler);

  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get(/^(.*)$/, (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

createServer();
