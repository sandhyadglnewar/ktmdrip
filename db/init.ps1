#!/usr/bin/env pwsh
# Initialize local D1 database with schema and seed data
# Run: .\db\init.ps1

Write-Host "📦 Initializing local D1 database..." -ForegroundColor Cyan

# Create database
Write-Host "Creating database..." -ForegroundColor Gray
npx wrangler d1 execute ktmdrip-db --file db/schema.sql --local 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Database schema created" -ForegroundColor Green
} else {
  Write-Host "⚠️  Database may already exist" -ForegroundColor Yellow
}

# Seed database
Write-Host "Seeding products..." -ForegroundColor Gray
npx wrangler d1 execute ktmdrip-db --file db/seed.sql --local 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Database seeded with products" -ForegroundColor Green
} else {
  Write-Host "⚠️  Seeding may have had issues (could be duplicates)" -ForegroundColor Yellow
}

Write-Host "`n✨ Local D1 database is ready!`n" -ForegroundColor Green
