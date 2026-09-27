import {LoggerService} from "@nestjs/common";
import {trace} from "@opentelemetry/api";

const environment = process.env.OTEL_DEPLOYMENT_ENVIRONMENT || process.env.NODE_ENV || 'development';

export function createLogger(service: string): LoggerService {
    const emit = (
        level: 'log' | 'warn' | 'error' | 'debug' | 'info' | 'verbose',
        message: unknown,
        optionalParams: unknown[],
    ): void => {
        const payload: Record<string, unknown> = {
            time: new Date().toISOString(),
            level,
            message: message instanceof Error ? message.message : message,
            service,
            environment
        }

        if (message instanceof Error) {
            payload.error = {
                name: message.name,
                message: message.message,
                stack: message.stack,
            }
        }

        const last = [...optionalParams].pop()
        if (typeof last === 'string') {
            payload.context = last
        } else if (typeof last === 'object') {
            payload.metadata = last
        }

        const span = trace.getActiveSpan()?.spanContext()
        if (span) {
            payload.traceId = span.traceId
            payload.spanId = span.spanId
        }

        process.stdout.write(`${JSON.stringify(payload)}\n`)
    }

    return {
        log: (message, ...params) => emit('log', message, params),
        error: (message, ...params) => emit('error', message, params),
        debug: (message, ...params) => emit('debug', message, params),
        warn: (message, ...params) => emit('warn', message, params),
        verbose: (message, ...params) => emit('verbose', message, params)
    }
}