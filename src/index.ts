import "dotenv/config";

if (process.env.APMINSIGHT_ENABLED === "true") {
  try {
    const { default: AgentAPI } = await import("apminsight");
    AgentAPI.config();
  } catch (error) {
    console.error("Failed to initialize APM Insight:", error);
  }
}

import express from "express";
import cors from "cors";
import subjectsRouter from "./routes/subjectsRouter";
import classesRouter from "./routes/classesRouter";
import securityMiddleware from "./middleware/security";
import { auth } from "./lib/auth";
import { toNodeHandler } from "better-auth/node";

const app = express();
const PORT = Number(process.env.PORT) || 8000;
const HOST = "0.0.0.0";

app.use(express.json());
app.use(securityMiddleware);

if (!process.env.FRONTEND_URL) {
  throw new Error("FRONTEND_URL is not defined");
}

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.all("/api/auth/*splat", toNodeHandler(auth));

app.get("/", (req, res) => {
  res.send("Classroom API is running.");
});

app.use("/api/subjects", subjectsRouter);
app.use("/api/classes", classesRouter);

app.listen(PORT, HOST, () => {
  console.log(`Server running on ${HOST}:${PORT}`);
});
