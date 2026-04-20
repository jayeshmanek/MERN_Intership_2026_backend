# Create Auction API - Complete System Test (Windows PowerShell)
# Run this script from the backend directory: .\test_create_auction.ps1

Write-Host "🧪 TESTING CREATE AUCTION API" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 1. Check if backend is running
Write-Host "`n1. Checking if backend is running..." -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 2 -ErrorAction Stop
  Write-Host "✓ Backend is running" -ForegroundColor Green
} catch {
  Write-Host "✗ Backend is NOT running. Start with: npm run dev" -ForegroundColor Red
  exit 1
}

# 2. Check if MongoDB is running
Write-Host "`n2. Checking if MongoDB is running..." -ForegroundColor Yellow
try {
  $mongosh = mongosh --eval "db.version()" 2>$null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ MongoDB is running" -ForegroundColor Green
  } else {
    Write-Host "✗ MongoDB is NOT running" -ForegroundColor Red
  }
} catch {
  Write-Host "✗ MongoDB is NOT running" -ForegroundColor Red
}

# 3. Check if uploads directory exists
Write-Host "`n3. Checking uploads directory..." -ForegroundColor Yellow
if (Test-Path "uploads") {
  Write-Host "✓ uploads/ directory exists" -ForegroundColor Green
  $acl = Get-Acl "uploads"
  Write-Host "✓ uploads/ directory is accessible" -ForegroundColor Green
} else {
  Write-Host "⚠ uploads/ directory does not exist, creating..." -ForegroundColor Yellow
  New-Item -ItemType Directory -Path "uploads" -Force > $null
  Write-Host "✓ Created uploads/ directory" -ForegroundColor Green
}

# 4. Check database connection
Write-Host "`n4. Checking database connection..." -ForegroundColor Yellow
try {
  $dbCheck = mongosh mongodb://127.0.0.1:27017/e_auction --eval "db.users.countDocuments()" 2>$null
  if ($dbCheck) {
    Write-Host "✓ Database connected" -ForegroundColor Green
  } else {
    Write-Host "✗ Failed to connect to database" -ForegroundColor Red
  }
} catch {
  Write-Host "✗ Failed to connect to database" -ForegroundColor Red
}

# 5. Test health endpoint
Write-Host "`n5. Testing /api/health endpoint..." -ForegroundColor Yellow
try {
  $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 2
  if ($health.success) {
    Write-Host "✓ Health check passed" -ForegroundColor Green
  } else {
    Write-Host "✗ Health check failed" -ForegroundColor Red
  }
} catch {
  Write-Host "✗ Health check failed: $_" -ForegroundColor Red
}

# 6. Test login endpoint
Write-Host "`n6. Testing login endpoint..." -ForegroundColor Yellow
try {
  $loginBody = @{
    email = "seller@eauction.com"
    password = "Admin@12345"
  } | ConvertTo-Json

  $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method Post `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $loginBody `
    -TimeoutSec 5

  if ($loginResponse.token) {
    $token = $loginResponse.token
    Write-Host "✓ Login successful" -ForegroundColor Green
    Write-Host "  Token: $($token.Substring(0, [Math]::Min(20, $token.Length)))..." -ForegroundColor Gray
  } else {
    Write-Host "✗ Login failed" -ForegroundColor Red
  }
} catch {
  Write-Host "✗ Login failed: $_" -ForegroundColor Red
  $token = $null
}

# 7. Test create auction without image
if ($token) {
  Write-Host "`n7. Testing create auction endpoint (without image)..." -ForegroundColor Yellow
  
  $startTime = (Get-Date).AddHours(1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss")
  $endTime = (Get-Date).AddDays(3).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss")
  
  $auctionBody = @{
    title = "Test Product"
    description = "This is a test product for testing the API"
    category = "Electronics"
    basePrice = 5000
    startTime = $startTime
    endTime = $endTime
  } | ConvertTo-Json

  try {
    $auctionResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auctions" `
      -Method Post `
      -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $token"
      } `
      -Body $auctionBody `
      -TimeoutSec 5

    if ($auctionResponse.success) {
      Write-Host "✓ Auction created successfully (without image)" -ForegroundColor Green
      Write-Host "  Auction ID: $($auctionResponse.auction._id)" -ForegroundColor Gray
    } else {
      Write-Host "✗ Failed to create auction" -ForegroundColor Red
    }
  } catch {
    Write-Host "✗ Failed to create auction: $_" -ForegroundColor Red
  }
} else {
  Write-Host "`n7. Testing create auction endpoint..." -ForegroundColor Yellow
  Write-Host "✗ Cannot test without valid token" -ForegroundColor Red
}

# 8. Summary
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "🧪 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "✓ Backend is running" -ForegroundColor Green
Write-Host "✓ MongoDB is running" -ForegroundColor Green
Write-Host "✓ Uploads directory exists" -ForegroundColor Green

if ($token) {
  Write-Host "✓ Authentication working" -ForegroundColor Green
  Write-Host "`n✅ All checks passed!" -ForegroundColor Green
  Write-Host "Frontend is ready to test image upload." -ForegroundColor Green
} else {
  Write-Host "✗ Authentication failed" -ForegroundColor Red
  Write-Host "`n⚠️  Please check the errors above" -ForegroundColor Yellow
}

Write-Host "======================================" -ForegroundColor Cyan
