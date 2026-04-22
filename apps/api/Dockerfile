FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/
COPY packages/rule-engine/package.json packages/rule-engine/
COPY packages/ocr-sdk/package.json packages/ocr-sdk/
COPY apps/api/package.json apps/api/
RUN npm ci
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/
RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=packages/shared-utils
RUN npm run build --workspace=packages/rule-engine
RUN npm run build --workspace=packages/ocr-sdk
RUN npm run build --workspace=apps/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/packages/shared-types/dist packages/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json packages/shared-types/
COPY --from=builder /app/packages/shared-utils/dist packages/shared-utils/dist
COPY --from=builder /app/packages/shared-utils/package.json packages/shared-utils/
COPY --from=builder /app/packages/rule-engine/dist packages/rule-engine/dist
COPY --from=builder /app/packages/rule-engine/package.json packages/rule-engine/
COPY --from=builder /app/packages/ocr-sdk/dist packages/ocr-sdk/dist
COPY --from=builder /app/packages/ocr-sdk/package.json packages/ocr-sdk/
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/package.json apps/api/
RUN npm ci --omit=dev
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
