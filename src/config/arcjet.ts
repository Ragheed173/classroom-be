import arcjet, { detectBot, shield, slidingWindow, type ArcjetMode } from "@arcjet/node";

if (!process.env.ARCJET_KEY) {
    throw new Error("ARCJET_KEY is not set in .env file");
}

export const arcjetMode: ArcjetMode =
    process.env.ARCJET_ENV === "development" ? "DRY_RUN" : "LIVE";

const aj = arcjet({
    key: process.env.ARCJET_KEY!,
    rules: [
      shield({ mode: arcjetMode }),
      detectBot({
        mode: arcjetMode,
        allow: [
          "CATEGORY:SEARCH_ENGINE",
          "CATEGORY:PREVIEW",
        ],
      }),
      slidingWindow({
        mode: arcjetMode,
        interval: 2,
        max: 5,
      })
    ],
  });

export default aj;