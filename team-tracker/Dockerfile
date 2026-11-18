FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
ENV NODE_ENV=production PORT=3100 DATA_DIR=/app/data
VOLUME ["/app/data"]
EXPOSE 3100
CMD ["node", "--disable-warning=ExperimentalWarning", "src/server.js"]
