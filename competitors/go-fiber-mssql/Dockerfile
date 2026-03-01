# syntax=docker/dockerfile:1

FROM golang:alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build the executable
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:3.23.2 AS runtime

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/main .

EXPOSE 3000

CMD ["./main"]
