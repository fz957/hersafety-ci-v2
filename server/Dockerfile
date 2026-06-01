FROM node:20-alpine
WORKDIR /app

# Copy and install dependencies
COPY server/package*.json ./
RUN npm install

# Copy application code
COPY server . .

# Copy entrypoint script
COPY server/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Expose port
EXPOSE 10000

# Set default environment variables
ENV DATABASE_URL=postgresql://localhost/hersafety
ENV JWT_SECRET=default_jwt_secret_change_in_production
ENV JWT_REFRESH_SECRET=default_refresh_secret_change_in_production
ENV APP_MODE=production
ENV PORT=10000
ENV NODE_ENV=production

# Use entrypoint script to configure and start
ENTRYPOINT ["./entrypoint.sh"]
