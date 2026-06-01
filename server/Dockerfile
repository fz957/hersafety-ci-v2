FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server . .

RUN npm run migrate 2>/dev/null || true

EXPOSE 10000

# Set default environment variables if not provided
ENV DATABASE_URL=${DATABASE_URL:-postgresql://localhost/hersafety}
ENV JWT_SECRET=${JWT_SECRET:-change_this_secret_in_production_12345}
ENV JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-change_this_refresh_secret_in_production_12345}
ENV APP_MODE=${APP_MODE:-production}
ENV PORT=10000

CMD ["npm", "start"]
