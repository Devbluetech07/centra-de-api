FROM golang:1.26-alpine AS build
WORKDIR /app
COPY . .
RUN go mod download && go build -o /bin/api ./cmd/api

FROM alpine:3.22
WORKDIR /srv
COPY --from=build /bin/api /usr/local/bin/api
EXPOSE 3001
CMD ["api"]
