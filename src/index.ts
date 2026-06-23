//import "./apm.js";

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

    app.use("/subjects", subjectsRouter);
    app.use("/classes", classesRouter);
    app.use("/users", usersRouter);

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("BOOTSTRAP ERROR:");
    console.error(error);
    throw error;
  }
}

bootstrap().catch((error) => {
  console.error("FAILED TO START SERVER");
  console.error(error);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:");
  console.error(err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:");
  console.error(err);
});

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
