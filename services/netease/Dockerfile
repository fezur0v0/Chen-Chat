FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY --chown=node:node gateway.mjs start.mjs ./
ENV HOST=0.0.0.0
USER node
CMD ["node", "start.mjs"]
