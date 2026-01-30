#!/bin/bash

echo "🚀 ReferralFlow AI Setup"
echo "========================"

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not found. Please install Docker Desktop first."
    echo "   Download: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Start Docker containers
echo "📦 Starting Docker containers..."
docker compose up -d

# Wait for Postgres to be ready
echo "⏳ Waiting for PostgreSQL..."
sleep 5

# Install API dependencies
echo "📚 Installing API dependencies..."
cd api
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run migrations
echo "🗄️  Running database migrations..."
npx prisma db push

# Seed database
echo "🌱 Seeding database..."
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the servers:"
echo "  Terminal 1: cd api && npm run dev    (API on port 4000)"
echo "  Terminal 2: npm run dev              (Frontend on port 3000)"
