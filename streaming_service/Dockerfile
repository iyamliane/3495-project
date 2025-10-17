# Use the official Node.js image
FROM node:20

# Set working directory inside container
WORKDIR /app

# Copy dependency definitions first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Expose Express app port
EXPOSE 4000

# Run the service
CMD ["node", "server.js"]
