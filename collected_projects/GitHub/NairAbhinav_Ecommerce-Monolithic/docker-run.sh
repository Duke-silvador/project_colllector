#!/usr/bin/env bash
# ==============================================================
# Script: Run Monolithic E-Commerce Application (Pure Docker CLI)
# Without using Docker Compose
# ==============================================================

set -e

echo ">>> Step 1: Creating persistent Docker volume for MongoDB..."
docker volume create mongo_data

echo ">>> Step 2: Creating Docker network..."
docker network create ecom-network 2>/dev/null || true

echo ">>> Step 3: Starting MongoDB Container with Persistent Volume..."
docker stop ecom-mongo 2>/dev/null || true
docker rm ecom-mongo 2>/dev/null || true
docker run -d \
  --name ecom-mongo \
  --network ecom-network \
  -v mongo_data:/data/db \
  -p 27017:27017 \
  mongo:7

echo ">>> Step 4: Building Monolithic Web Application Docker Image..."
docker build -t ecom-monolith:latest .

echo ">>> Step 5: Starting Monolithic Web Application Container..."
docker stop ecom-app 2>/dev/null || true
docker rm ecom-app 2>/dev/null || true
docker run -d \
  --name ecom-app \
  --network ecom-network \
  -p 5000:5000 \
  -e MONGO_URI="mongodb://ecom-mongo:27017/phone-ecom" \
  -e JWT_SECRET="super_secret_jwt_token_key_987654321" \
  -e NODE_ENV="production" \
  ecom-monolith:latest

echo ">>> Step 6: Waiting for backend to initialize..."
sleep 5

echo ">>> Step 7: Seeding MongoDB Database inside Container..."
docker exec -i ecom-app node seed.js

echo "=========================================================="
echo "Monolithic Website is running successfully!"
echo "URL: http://localhost:5000"
echo "Database persistence: docker volume 'mongo_data' (/data/db)"
echo "=========================================================="
