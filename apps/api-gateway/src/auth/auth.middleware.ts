import {Injectable, NestMiddleware} from "@nestjs/common";
import {JwtService} from "@nestjs/jwt";
import {NextFunction, Request, Response} from "express";

@Injectable()
export class AuthMiddleware implements NestMiddleware {
    constructor(private readonly jwtService: JwtService) {}

    async use(req: Request, res: Response, next: NextFunction) {
        const path = req.originalUrl

        const publicRoutes = ['/auth/register', '/auth/login'];

        if (publicRoutes.some((route) => path === route || path.startsWith(`${route}?`))) {
            return next()
        }

        const authorization = req.headers.authorization

        if (!authorization) {
            return res.status(401).json({ message: 'Missing authorization token'})
        }

        const [type, token] = authorization.split(' ')

        if (type !== 'Bearer' || !token) {
            return res.status(401).json({ message: 'Invalid token' })
        }

        try {
            const payload = await this.jwtService.verifyAsync(token)

            delete req.headers['x-user-id']
            delete req.headers['x-user-email']

            req.headers['x-user-id'] = String(payload.sub);
            req.headers['x-user-email'] = payload.email;

            (req as Request & { user?: unknown }).user = payload;

            next()
        } catch {
            return res.status(401).json({ message: 'Invalid token' })
        }
    }
}