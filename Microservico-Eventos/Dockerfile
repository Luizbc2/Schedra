FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ARG SCHEDRA_RELEASE=development
ENV NODE_ENV=production SCHEDRA_RELEASE=$SCHEDRA_RELEASE
LABEL org.opencontainers.image.revision=$SCHEDRA_RELEASE
COPY package*.json ./
RUN npm ci --omit=dev && mkdir -p /data && chown node:node /data
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3334
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=15 CMD node -e "fetch('http://127.0.0.1:3334/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
