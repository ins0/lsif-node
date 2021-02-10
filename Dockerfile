FROM sourcegraph/src-cli:3.16.1@sha256:b5dd688d25557eaa5fb0ec33cf2cc15a87bc72a7f5d9efa6d5e461644e93ac09 AS src-cli

FROM node:14.15-alpine3.10@sha256:fd87531f9bf187273c77ad3ddd5067110ef983f998fc2ea1b9932950df78bd8c

ARG TAG

RUN apk add --no-cache git

COPY --from=src-cli /usr/bin/src /usr/bin

RUN npm install -g @sourcegraph/lsif-tsc@${TAG}

CMD ["/bin/sh"]
