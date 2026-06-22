import { Request, Response, NextFunction } from "express";
import { RateLimitRole } from "../type";
import aj from "../config/arcjet";
import { ArcjetNodeRequest, ArcjetRequest, slidingWindow } from "@arcjet/node";

const securityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    if(process.env.NODE_ENV === "test") {
    try {
        const role: RateLimitRole = req.user?.role ?? 'anonymous';

        let limit: number;
        let message: string;

        switch(role) {
            case "admin":
                limit = 20;
                message = "Admin request limit exceeded (20 per minute)";
                break;
            case "teacher":
            case "student":
                limit = 10;
                message = "User request limit exceeded (10 per minute)";
                break;
            default:
                limit = 5;
                message = "Anonymous request limit exceeded (1 per minute)";
                break;
        }

        const client = await aj.withRule(
            slidingWindow({
                mode: 'LIVE',
                interval: '1m',
                max: limit,
            })
        )

        const arcjetRequest: ArcjetNodeRequest = {
            headers: req.headers,
            method: req.method,
            url: req.originalUrl ?? req.url,
            socket: { remoteAddress: req.socket.remoteAddress ?? req.ip ?? '0.0.0.0'},
        }

        const decision = await client.protect(arcjetRequest);

        if(decision.isDenied() && decision.reason.isBot()) {
            return res.status(403).json({ error: "Forbidden", massage: "Bot request are not allowed" });
        }
        if(decision.isDenied() && decision.reason.isShield()) {
            return res.status(403).json({ error: "Forbidden", massage: "Shielded request are not allowed" });
        }
        if(decision.isDenied() && decision.reason.isRateLimit()) {
            return res.status(429).json({ error: "Too Many Requests", massage: message });
        }

        next();
        
    } catch (e) {
        console.error("Error in security middleware", e);
        res.status(500).json({ error: "Internal server error", massage: "something went wrong" });
    }
}
};

export default securityMiddleware;