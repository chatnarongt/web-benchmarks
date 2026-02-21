FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the executable using the build script
RUN bun run build:alpine

# Final stage
FROM alpine

WORKDIR /app

# Install ca-certificates and libstdc++ for runtime dependencies
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache ca-certificates libstdc++

# Copy the standalone executable from the builder stage
COPY --from=builder /app/dist/server /app/server

# Set environment variables
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3000

# Run the standalone executable
CMD ["/app/server"]
