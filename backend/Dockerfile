# syntax=docker/dockerfile:1
# Backend API per Cloud Run. Piattaforma supportata: linux/amd64.
# Build dal root del repo (serve il lockfile dei workspace):
#   docker build -f backend/Dockerfile -t gabri-backend .
# Per le release, pinnare il digest dell'immagine base (node:22-slim@sha256:...).

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
RUN --mount=type=cache,target=/root/.npm npm ci --workspace backend
COPY backend/tsconfig.json backend/
COPY backend/src backend/src
RUN npm run build --workspace backend

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
RUN --mount=type=cache,target=/root/.npm npm ci --workspace backend --omit=dev

FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app /app
COPY --from=build /app/backend/dist ./backend/dist
USER node
EXPOSE 8080
CMD ["node", "backend/dist/index.js"]
