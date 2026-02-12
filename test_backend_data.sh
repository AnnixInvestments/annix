#!/bin/bash

# Quick Test Script - Check Available Data in Annix Backend
# Run this while backend is running: yarn start:dev

echo "🔍 Checking Annix Backend Data..."
echo ""

BASE_URL="http://localhost:4001"

echo "1️⃣ Testing Steel Specifications..."
curl -s "$BASE_URL/steel-specification" | jq -r '.[] | "\(.id): \(.steel_spec_name // .steelSpecName)"' 2>/dev/null || echo "   ❌ Failed or no data"
echo ""

echo "2️⃣ Testing Nominal Bores..."
curl -s "$BASE_URL/nominal-outside-diameter-mm" | jq -r '.[0:10] | .[] | "   NB: \(.nominal_diameter_mm)mm, OD: \(.outside_diameter_mm)mm"' 2>/dev/null || echo "   ❌ Failed or no data"
echo ""

echo "3️⃣ Testing Pipe Dimensions for 100NB..."
curl -s "$BASE_URL/pipe-dimensions?nominalBore=100" | jq -r '.[] | "   Schedule: \(.schedule_designation // "N/A"), WT: \(.wall_thickness_mm)mm, Weight: \(.mass_kgm)kg/m"' 2>/dev/null || echo "   ❌ Failed or no data"
echo ""

echo "4️⃣ Testing Calculation Endpoint (100NB Sch40)..."
curl -s -X POST "$BASE_URL/rfq/straight-pipe/calculate" \
  -H "Content-Type: application/json" \
  -d '{
    "nominalBoreMm": 100,
    "scheduleType": "schedule",
    "scheduleNumber": "Sch40",
    "individualPipeLength": 6.1,
    "lengthUnit": "meters",
    "quantityType": "total_length",
    "quantityValue": 1000,
    "workingPressureBar": 16,
    "workingTemperatureC": 20,
    "steelSpecificationId": 2
  }' | jq '.' 2>/dev/null || echo "   ❌ Calculation failed"
echo ""

echo "5️⃣ Testing Flange Standards..."
curl -s "$BASE_URL/flange-standard" | jq -r '.[] | "   \(.id): \(.code)"' 2>/dev/null || echo "   ❌ Failed or no data"
echo ""

echo "✅ Test Complete!"
echo ""
echo "💡 If you see errors, try these combinations that typically exist:"
echo "   - 100NB with STD schedule"
echo "   - 150NB with Sch40"
echo "   - 200NB with XS"
