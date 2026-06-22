import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as schema from "../db/schema/index";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: [process.env.FRONTEND_URL!],
    database: drizzleAdapter(db, {
        provider: "pg",
        schema,
    }),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        additionalFields: {
            role: { type: "string", required: false, defaultValue: "student", input: false },
            imageCldPubId: { type: "string", required: false, input: false },
        },
    },
});
