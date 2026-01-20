FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

EXPOSE 3000
EXPOSE 9300

CMD ["npm", "run", "dev"]
