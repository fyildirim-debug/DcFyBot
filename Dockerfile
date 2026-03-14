FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

RUN mkdir -p data/backups

EXPOSE 3000

CMD ["node", "src/index.js"]
