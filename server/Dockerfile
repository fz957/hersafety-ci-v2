FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run migrate 2>/dev/null || true
EXPOSE 10000
CMD ["npm", "start"]
