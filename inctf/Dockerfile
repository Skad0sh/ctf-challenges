FROM golang:alpine
RUN apk add build-base

WORKDIR /app

COPY deployment/go.mod .
COPY deployment/go.sum .
RUN go mod download

COPY deployment/src/. .

RUN go build -o /server

ENV ADMIN_BUCKET "b5cd7ae0-7b50-7ae0-7ae0-47a03b473015"
ENV FLAG "InCTFi{a_super_secret_flag}"
ENV PORT ":8080"
ENV SECRET "65273AGH1*--*Onaks:/23*&5213"
ENV VAL_A "245"
ENV VAL_B "143"

EXPOSE 8080

CMD [ "/server" ]
