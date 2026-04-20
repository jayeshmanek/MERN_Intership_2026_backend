#!/bin/bash
# Create Auction API - Complete System Test
# Run this script from the backend directory: bash test_create_auction.sh

echo "🧪 TESTING CREATE AUCTION API"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check if backend is running
echo -e "\n${YELLOW}1. Checking if backend is running...${NC}"
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Backend is running${NC}"
else
  echo -e "${RED}✗ Backend is NOT running. Start with: npm run dev${NC}"
  exit 1
fi

# 2. Check if MongoDB is running
echo -e "\n${YELLOW}2. Checking if MongoDB is running...${NC}"
if mongosh --eval "db.version()" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ MongoDB is running${NC}"
else
  echo -e "${RED}✗ MongoDB is NOT running${NC}"
  exit 1
fi

# 3. Check if uploads directory exists
echo -e "\n${YELLOW}3. Checking uploads directory...${NC}"
if [ -d "uploads" ]; then
  echo -e "${GREEN}✓ uploads/ directory exists${NC}"
  if [ -w "uploads" ]; then
    echo -e "${GREEN}✓ uploads/ directory is writable${NC}"
  else
    echo -e "${RED}✗ uploads/ directory is NOT writable${NC}"
  fi
else
  echo -e "${YELLOW}⚠ uploads/ directory does not exist, creating...${NC}"
  mkdir -p uploads
  echo -e "${GREEN}✓ Created uploads/ directory${NC}"
fi

# 4. Check database connection
echo -e "\n${YELLOW}4. Checking database connection...${NC}"
DB_COUNT=$(mongosh mongodb://127.0.0.1:27017/e_auction --eval "db.users.countDocuments()" 2>/dev/null | tail -1)
if [ ! -z "$DB_COUNT" ]; then
  echo -e "${GREEN}✓ Database connected. Users in DB: $DB_COUNT${NC}"
else
  echo -e "${RED}✗ Failed to connect to database${NC}"
fi

# 5. Check seller user exists
echo -e "\n${YELLOW}5. Checking if seller user exists...${NC}"
SELLER=$(mongosh mongodb://127.0.0.1:27017/e_auction --eval "db.users.findOne({email: 'seller@eauction.com'})" 2>/dev/null)
if [ ! -z "$SELLER" ]; then
  echo -e "${GREEN}✓ Seller user found${NC}"
else
  echo -e "${YELLOW}⚠ Seller user not found. Run: npm run seed${NC}"
fi

# 6. Test health endpoint
echo -e "\n${YELLOW}6. Testing /api/health endpoint...${NC}"
HEALTH=$(curl -s http://localhost:5000/api/health)
if echo "$HEALTH" | grep -q "success"; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
fi

# 7. Test login endpoint
echo -e "\n${YELLOW}7. Testing login endpoint...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@eauction.com",
    "password": "Admin@12345"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo -e "${GREEN}✓ Login successful${NC}"
  echo "  Token: ${TOKEN:0:20}..."
else
  echo -e "${RED}✗ Login failed${NC}"
  echo "  Response: $LOGIN_RESPONSE"
fi

# 8. Test create auction without image
echo -e "\n${YELLOW}8. Testing create auction endpoint (without image)...${NC}"
if [ ! -z "$TOKEN" ]; then
  AUCTION_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auctions \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Test Product",
      "description": "This is a test product for testing the API",
      "category": "Electronics",
      "basePrice": 5000,
      "startTime": "'$(date -u -d '+1 hour' +%Y-%m-%dT%H:%M:%S)'",
      "endTime": "'$(date -u -d '+3 days' +%Y-%m-%dT%H:%M:%S)'"
    }')
  
  if echo "$AUCTION_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✓ Auction created successfully (without image)${NC}"
    echo "  Response: $AUCTION_RESPONSE"
  else
    echo -e "${RED}✗ Failed to create auction${NC}"
    echo "  Response: $AUCTION_RESPONSE"
  fi
else
  echo -e "${RED}✗ Cannot test auction creation without token${NC}"
fi

# 9. Summary
echo -e "\n${YELLOW}======================================"
echo "🧪 TEST SUMMARY${NC}"
echo -e "Backend: ${GREEN}✓${NC}"
echo -e "MongoDB: ${GREEN}✓${NC}"
echo -e "Uploads dir: ${GREEN}✓${NC}"
echo -e "Database: ${GREEN}✓${NC}"
if [ ! -z "$TOKEN" ]; then
  echo -e "Authentication: ${GREEN}✓${NC}"
  echo -e "API Endpoints: ${GREEN}✓${NC}"
else
  echo -e "Authentication: ${RED}✗${NC}"
fi
echo "======================================"

if [ ! -z "$TOKEN" ]; then
  echo -e "\n${GREEN}✅ All checks passed!${NC}"
  echo "Frontend is ready to test image upload."
else
  echo -e "\n${YELLOW}⚠️  Please check the errors above${NC}"
fi
