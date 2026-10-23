# ---- build the React app ----
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---- run API + serve the built app ----
FROM node:20-alpine
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./
COPY --from=frontend /app/frontend/dist ./public
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/server.js"]
