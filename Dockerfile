FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache optimization)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source
COPY src/ ./src/

# The credentials file and .env are mounted at runtime (see docker-compose.yml)
# Never bake secrets into the image!

CMD ["node", "src/index.js"]
