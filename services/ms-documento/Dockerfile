FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache fontconfig ttf-dejavu
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
EXPOSE 3002
CMD ["npm", "run", "start"]
