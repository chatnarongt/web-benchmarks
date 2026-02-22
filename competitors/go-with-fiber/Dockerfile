# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Run stage
FROM alpine:latest

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/main .

EXPOSE 3000

CMD ["./main"]
