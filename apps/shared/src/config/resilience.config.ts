import {registerAs} from "@nestjs/config";

export default registerAs('resilience', () => ({
    timeoutMs: Number(process.env.TIMEOUT_MS ?? 5_000),
    maxAttempts: Number(process.env.MAX_ATTEMPTS ?? 3),
    failureThreshold: Number(process.env.FAILURE_THRESHOLD ?? 3),
    halfOpenAfterMs: Number(process.env.HALF_OPEN_AFTER_MS ?? 10_000),
    bulkheadLimit: Number(process.env.BULKHEAD_LIMIT ?? 10),
    bullheadQueue: Number(process.env.BULKHEAD_QUEUE ?? 10),
}))