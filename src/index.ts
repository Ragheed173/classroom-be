import "./apm.js";

const REQUIRED_ENV = [
  "DATABASE_URL",
  "FRONTEND_URL",
  "ARCJET_KEY",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
] as const;

function validateEnv(): void {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

async function bootstrap(): Promise<void> {
  validateEnv();

  const express = (await import("express")).default;
  const cors = (await import("cors")).default;
  const { default: subjectsRouter } = await import("./routes/subjectsRouter.js");
  const { default: classesRouter } = await import("./routes/classesRouter.js");
  const { default: usersRouter } = await import("./routes/usersRouter.js");
  const { default: securityMiddleware } = await import("./middleware/security.js");
  const { auth } = await import("./lib/auth.js");
  const { toNodeHandler } = await import("better-auth/node");

  const app = express();
  const port = Number(process.env.PORT) || 8000;
  const host = "0.0.0.0";

  app.use(express.json());
  app.use(securityMiddleware);

  app.use(cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }));

  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.get("/", (_req, res) => {
    res.send("Classroom API is running.");
  });

  app.use("/api/subjects", subjectsRouter);
  app.use("/api/classes", classesRouter);
  app.use("/api/users", usersRouter);

  app.listen(port, host, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
