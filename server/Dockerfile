FROM node:20-alpine
WORKDIR /app

# Copy and install dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy application code
COPY server . .

# Expose port
EXPOSE 10000

# Set default environment variables (will be overridden by Railway)
ENV DATABASE_URL=postgresql://localhost/hersafety
ENV JWT_SECRET=default_jwt_secret_change_in_production
ENV JWT_REFRESH_SECRET=default_refresh_secret_change_in_production
ENV APP_MODE=production
ENV PORT=10000
ENV NODE_ENV=production

# Start the app directly with npm
CMD ["npm", "start"]
