FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema apps/product-service/prisma/schema.prisma
RUN npx nest build product-service

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/@prisma/product-client ./node_modules/@prisma/product-client
COPY --from=build /app/dist/apps/product-service/main.js ./main.js
COPY apps/product-service/prisma ./apps/product-service/prisma
COPY apps/shared/proto ./apps/shared/proto
EXPOSE 3000 5001
CMD ["sh", "-c", "npx prisma migrate deploy --schema apps/product-service/prisma/schema.prisma && node main.js"]