FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY . .
RUN npm install && npm run build
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app ./
EXPOSE 4000
CMD ["npm","run","start"]
