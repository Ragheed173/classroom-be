type UserRole = "admin"| "teacher"| "student";

type RateLimitRole = UserRole | "anonymous";

export type { UserRole, RateLimitRole };