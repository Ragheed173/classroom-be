import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";

if (!process.env.ARCJET_KEY) {
    throw new Error("ARCJET_KEY is not set in .env file");
}

const aj = arcjet({
    key: process.env.ARCJET_KEY!,
    rules: [
      shield({ mode: "LIVE" }),
      detectBot({
        mode: "LIVE", 
        allow: [
          "CATEGORY:SEARCH_ENGINE", 
          "CATEGORY:PREVIEW", 
        ],
      }),
      slidingWindow({
        mode: "LIVE",
        interval: 2,
        max: 5,
      })
    ],
  });

export default aj;