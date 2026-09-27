import {register} from "node:module";
import {resolve} from "node:path";

register('@opentelemetry/instrumentation/hook.mjs', import.meta.url)

const disable = process.env.OTEL_SDK_DISABLED === 'true' || process.env.OTEL_TRACES_EXPORTER === 'none'

const entry = resolve(process.cwd(), process.env.OTEL_APP_ENTRY ?? './main.js')

if (disable) {
    await import(entry)
} else {
    const { registerInstrumentations } = await import('@opentelemetry/instrumentation')
    const { HttpInstrumentation } = await import('@opentelemetry/instrumentation-http')
    const { ExpressInstrumentation } = await import('@opentelemetry/instrumentation-express')
    const { GrpcInstrumentation } = await import('@opentelemetry/instrumentation-grpc')
    const { KafkaJsInstrumentation } = await import('@opentelemetry/instrumentation-kafkajs')
    const { resourceFromAttributes } = await import('@opentelemetry/resources')
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')
    const { NodeSDK } = await import('@opentelemetry/sdk-node')

    const serviceName = (process.env.OTEL_SERVICE_NAME || '').trim() || 'learning-microservices'
    const environment = process.env.OTEL_DEPLOYMENT_ENVIRONMENT || process.env.NODE_ENV || 'development'
    const endpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces'

    const isIgnoredPath = (value = '') => {
        const path = String(value).replace(/^https?:\/\/[^/]+/, '').split('?')[0]
        return path.startsWith('/health') || path.startsWith('/metrics')
    }

    const instrumentations = [
        new HttpInstrumentation({
            ignoreIncomingRequestHook: (request) => isIgnoredPath(request.url),
            ignoreOutgoingRequestHook: (options) => isIgnoredPath(options.path ?? options.href)
        }),
        new ExpressInstrumentation({}),
        new GrpcInstrumentation({}),
        new KafkaJsInstrumentation({}),
    ]

    registerInstrumentations({ instrumentations })

    const exporter = new OTLPTraceExporter({ url: endpoint })

    const sdk = new NodeSDK({
        resource: resourceFromAttributes({
            'service.name': serviceName,
            'service.namespace': 'learning-microservices',
            'deployment.environment': environment
        }),
        traceExporter: exporter
    })

    sdk.start()

    await import(entry)
}