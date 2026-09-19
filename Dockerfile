# Development image намеренно не копирует source: Compose передаёт его через bind mount для live reload.
FROM node:24.21.0-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6

WORKDIR /workspace

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV COREPACK_DEFAULT_TO_LATEST=0
ENV COREPACK_HOME=/usr/local/share/corepack

RUN mkdir -p "$COREPACK_HOME" \
  && corepack enable \
  && corepack prepare yarn@4.18.0 --activate \
  && chown -R node:node "$COREPACK_HOME"

# Development processes run as the unprivileged image user; Compose prepares writable named volumes first.
USER node
