FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY guards.mjs server.mjs ./
USER node
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.mjs"]
