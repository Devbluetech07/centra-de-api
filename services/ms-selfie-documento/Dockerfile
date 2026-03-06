FROM node:20-alpine
RUN apk add --no-cache fontconfig ttf-dejavu
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
EXPOSE 3004
CMD ["npm", "run", "start"]
