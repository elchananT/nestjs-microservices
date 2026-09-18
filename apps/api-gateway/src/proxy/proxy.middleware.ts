import { Injectable, NestMiddleware } from "@nestjs/common";
import {createProxyMiddleware} from "http-proxy-middleware";
import {NextFunction, Response, Request} from "express";
import {getService} from "../../../shared/discovery/discovery.client.js";

const routes = {
    '/products': 'product-service',
    '/orders': 'order-service',
    '/auth': 'user-service',
}

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
    private readonly proxy = createProxyMiddleware({
        router: async (req: Request) => {
            const route = Object.entries(routes).find(
                ([path]) => req.originalUrl.startsWith(path))

            if (!route) {
                return undefined
            }

            const [, serviceName] = route

            const instances = await getService(serviceName);

            const healthyInstance = instances.find(
                instance => instance.healthy)

            return healthyInstance?.url
        }
    })

    use(req: Request, res: Response, next: NextFunction) {
        if (!/^\/(products|orders|auth)(\/|$)/.test(req.originalUrl)) {
            return res.status(404).send("Not Found")
        }

        req.url = req.originalUrl;
        return this.proxy(req, res, next);
    }
}