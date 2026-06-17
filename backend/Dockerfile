FROM node:20-slim

WORKDIR /app

# Build tools needed for DuckDB native addon (node-gyp fallback)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json .
RUN npm install --omit=dev

COPY src/ ./src/

RUN mkdir -p /var/lib/duckdb

EXPOSE 3001

CMD ["node", "src/index.js"]
