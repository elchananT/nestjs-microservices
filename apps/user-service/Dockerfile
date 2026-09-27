FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema apps/user-service/prisma/schema.prisma
RUN npx nest build user-service

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/@prisma/user-client ./node_modules/@prisma/user-client
COPY --from=build /app/dist/apps/user-service/main.js ./main.js
COPY apps/user-service/prisma ./apps/user-service/prisma
COPY apps/shared/proto ./app/shared/proto
COPY apps/shared/src/observability/otel-setup.mjs ./otel-setup.mjs
EXPOSE 3002
CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/user-service/prisma/schema.prisma && node --import ./otel-setup.mjs main.js"]