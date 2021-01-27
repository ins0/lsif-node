FROM sourcegraph/src-cli:3.24.3@sha256:f90a66fa662860a59aea45a55622b21a9c9361575806ae54a80f04cea16d68e3 AS src-cli

FROM node:14.5-alpine3.10@sha256:7fb1e608dc4081c25930db83cb4a5df884b6a3f6e4e9f5fa2df08f22778fcfad

ARG TAG

RUN apk add --no-cache git

COPY --from=src-cli /usr/bin/src /usr/bin

RUN npm install -g @sourcegraph/lsif-tsc@${TAG}

CMD ["/bin/sh"]
