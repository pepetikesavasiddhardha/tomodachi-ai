# Use the official lightweight Node.js image.
FROM node:20-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy package.json first to leverage Docker cache
COPY package.json ./

# Install dependencies (removed --only=production to avoid npm warnings/errors)
RUN npm install

# Copy the rest of the local code to the container image.
COPY . .

# Expose the port Cloud Run expects
EXPOSE 8080

# Run the web service on container startup.
CMD ["npm", "start"]
