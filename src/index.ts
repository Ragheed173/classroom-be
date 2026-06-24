//import "./apm.js";
console.log("FILE LOADED");
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
  try {
    console.log("BOOTSTRAP START");

    validateEnv();
    console.log("ENV OK");

    const express = (await import("express")).default;
    console.log("EXPRESS OK");

    const cors = (await import("cors")).default;
    console.log("CORS OK");

    const { default: subjectsRouter } = await import("./routes/subjectsRouter.js");
    console.log("SUBJECTS OK");

    const { default: classesRouter } = await import("./routes/classesRouter.js");
    console.log("CLASSES OK");

    const { default: usersRouter } = await import("./routes/usersRouter.js");
    console.log("USERS OK");

    const { default: departmentsRouter } = await import("./routes/departmentsRouter.js");
    console.log("DEPARTMENTS OK");

    const { default: dashboardRouter } = await import("./routes/dashboardRouter.js");
    console.log("DASHBOARD OK");

    const { default: securityMiddleware } = await import("./middleware/security.js");
    console.log("SECURITY OK");

    const { auth } = await import("./lib/auth.js");
    console.log("AUTH OK");

    const { toNodeHandler } = await import("better-auth/node");
    console.log("BETTER AUTH OK");

    const app = express();

    const port = Number(process.env.PORT) || 8080;

    const allowedOrigins =
      process.env.FRONTEND_URL
        ?.split(",")
        .map((origin) => origin.trim().replace(/\/$/, ""))
        .filter(Boolean) ?? [];

    console.log("ALLOWED ORIGINS =", allowedOrigins);
    console.log("PORT =", process.env.PORT);

    app.use(
      cors({
        origin: true,
        credentials: true,
      })
    );

    app.use(express.json());

    app.get("/", (_req, res) => {
      res.send("Classroom API is running.");
    });

    app.get("/health", (_req, res) => {
      res.status(200).json({
        status: "ok",
      });
    });

    app.all("/api/auth/*splat", toNodeHandler(auth));

    app.use(securityMiddleware);

    app.use("/api/subjects", subjectsRouter);
    app.use("/api/classes", classesRouter);
    app.use("/api/users", usersRouter);
    app.use("/api/departments", departmentsRouter);
    app.use("/api/dashboard", dashboardRouter);

    app.use("/subjects", subjectsRouter);
    app.use("/classes", classesRouter);
    app.use("/users", usersRouter);
    app.use("/departments", departmentsRouter);
    app.use("/dashboard", dashboardRouter);

    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

    const shutdown = () => {
      console.log("Shutting down gracefully...");
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("BOOTSTRAP ERROR:");
    console.error(error);
    throw error;
  }
}

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
  process.exit(1);
});

bootstrap().catch((error) => {
  console.error("FAILED TO START SERVER:", error);
  process.exit(1);
});
