import {collectDefaultMetrics, Counter, Histogram, Metric, Registry} from "prom-client";
import {NextFunction, Request, RequestHandler, Response} from 'express'

export function createMetricsRegistry(serviceName: string): Registry {
    const registry = new Registry();

    registry.setDefaultLabels({ service: serviceName ?? 'api-gateway' });
    collectDefaultMetrics({ register: registry });

    return registry;
}

function normalizeRoute(req: Request): string {
    const raw = (req.originalUrl ?? req.url ?? '/').split('?')[0]
    const segments = raw.split('/').filter(Boolean)
    const normalize = segments
        .slice(0, 3)
        .map(segment => (/^\d+$/.test(segment) ? ':id' : segment))
        .join('/')

    let route = normalize.length > 0 ? `/${normalize}` : '/'
    if (segments.length > 3) {
        route += '/...'
    }

    return route
}

export function createMetricsMiddleware(registry: Registry): RequestHandler {
    const requestTotal = new Counter({
        name: 'http_server_requests_total',
        help: 'Total number of HTTP requests handle by the gateway',
        labelNames: ['method', 'route', 'status'],
        registers: [registry]
    })

    const requestDuration = new Histogram({
        name: 'http_server_requests_seconds',
        help: 'Duration of HTTP requests handle by the gateway',
        labelNames: ['method', 'route', 'status'],
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1],
        registers: [registry]
    })
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.path.startsWith('/metrics')) {
            res.setHeader('Content-Type', registry.contentType)
            registry
                .metrics()
                .then((text) => res.end(text))
                .catch((err) => {
                    res.status(500).send(err.message)
                })
            return;
        }

        if (req.path.startsWith('/health')) {
            next()
            return;
        }

        const start = process.hrtime.bigint()
        res.on('finish', () => {
            const seconds = Number(process.hrtime.bigint() - start) / 1e9
            const labels = {
                method: req.method ?? 'GET',
                route: normalizeRoute(req),
                status: String(res.statusCode ?? 0)
            }
            requestTotal.inc(labels)
            requestDuration.observe(labels, seconds)
        })
        next()
    }
}