FROM node:20-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Make entrypoint executable
RUN chmod +x ./entrypoint.sh

# Expose port
EXPOSE 5001

# Set default environment variables
ENV DATABASE_URL=postgresql://localhost/hersafety
ENV JWT_SECRET=default_jwt_secret_change_in_production
ENV JWT_REFRESH_SECRET=default_refresh_secret_change_in_production
ENV APP_MODE=production
ENV PORT=5001
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Use entrypoint script for logging and startup
ENTRYPOINT ["./entrypoint.sh"]
