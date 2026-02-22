FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Build native binary without CGO
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o benchmark .

FROM alpine:latest

WORKDIR /app
COPY --from=builder /app/benchmark .

EXPOSE 3000
CMD ["./benchmark"]
