# syntax=docker/dockerfile:1
FROM oven/bun:1.3.9-alpine AS base
RUN apk update && apk upgrade --no-cache
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS builder
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build:alpine

FROM alpine:3.23.2 AS runtime
RUN apk add --no-cache openssl ca-certificates libstdc++ libgcc
WORKDIR /app
COPY --from=builder /app/dist/server .
EXPOSE 3000
CMD ["/app/server"]
