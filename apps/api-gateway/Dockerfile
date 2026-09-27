FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx nest build api-gateway

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/api-gateway/main.js ./main.js
COPY apps/shared/src/observability/otel-setup.mjs ./otel-setup.mjs
EXPOSE 8080
CMD ["node", "--import","./otel-setup.mjs", "main.js"]