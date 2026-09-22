FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema apps/order-service/prisma/schema.prisma
RUN npx nest build order-service

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/@prisma/order-client ./node_modules/@prisma/order-client
COPY --from=build /app/dist/apps/order-service/main.js ./main.js
COPY apps/order-service/prisma ./apps/order-service/prisma
COPY apps/shared/proto ./apps/shared/proto
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/order-service/prisma/schema.prisma && node main.js"]