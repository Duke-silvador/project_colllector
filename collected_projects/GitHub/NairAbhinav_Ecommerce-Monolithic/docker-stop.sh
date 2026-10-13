#!/usr/bin/env bash
# ==============================================================
# Script: Stop Monolithic Containers
# Note: The database volume 'mongo_data' remains intact and preserved.
# ==============================================================

echo "Stopping and removing ecom-app container..."
docker stop ecom-app 2>/dev/null || true
docker rm ecom-app 2>/dev/null || true

echo "Stopping and removing ecom-mongo container..."
docker stop ecom-mongo 2>/dev/null || true
docker rm ecom-mongo 2>/dev/null || true

echo "Containers stopped. Persistent volume 'mongo_data' is safely preserved."
