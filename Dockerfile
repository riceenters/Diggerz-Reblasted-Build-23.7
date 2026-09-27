FROM node:22-alpine

WORKDIR /app
COPY . .

ENV NODE_ENV=production
ENV HOST=0.0.0.0

EXPOSE 8080

# Railway performs the HTTP health check itself. Avoid a second Docker
# HEALTHCHECK that can race Railway's probe during container startup.
CMD ["node", "diggerz-server.js"]
