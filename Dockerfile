FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/.next /app/.next
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["npm", "start"]