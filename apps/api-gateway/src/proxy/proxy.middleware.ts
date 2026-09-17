import { Injectable, NestMiddleware } from "@nestjs/common";
import {createProxyMiddleware} from "http-proxy-middleware";
import {NextFunction, Response, Request} from "express";

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
    private readonly proxy = createProxyMiddleware({
        router: (req, res) => {
            if (req.url?.startsWith("/products")) {
                return "http://localhost:3000"
            }

            if (req.url?.startsWith("/orders")) {
                return "http://localhost:3001"
            }

            return `http://localhost:3000`
        }
    })

    use(req: Request, res: Response, next: NextFunction) {
        if (!/^\/(products|orders)(\/|$)/.test(req.originalUrl)) {
            return res.status(404).send("Not Found")
        }

        req.url = req.originalUrl;
        return this.proxy(req, res, next);
    }
}