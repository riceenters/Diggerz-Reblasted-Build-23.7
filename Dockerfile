FROM node:22-alpine

WORKDIR /app
COPY . .

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=12 CMD wget -qO- "http://127.0.0.1:${PORT:-8080}/health" >/dev/null || exit 1

CMD ["npm", "start"]
