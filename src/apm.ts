import "dotenv/config";

if (process.env.APMINSIGHT_ENABLED !== "false") {
  process.env.APMINSIGHT_PORT ??= process.env.PORT ?? "8000";
  process.env.APMINSIGHT_APP_NAME ??= "classroom-BE";

  const { default: AgentAPI } = await import("apminsight");
  AgentAPI.config();
}
