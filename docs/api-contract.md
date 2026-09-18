# API Contract Specification

All backend API endpoints are exposed via AWS API Gateway HTTP API and respond with UTF-8 JSON.

---

## Standard Error Format
When an API error occurs (4xx or 5xx), the response body adheres to the following structure:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "quantity must be a positive number greater than 0.",
    "details": [
      {
        "field": "quantity",
        "issue": "Must be > 0"
      }
    ]
  }
}
```

---

## 1. Holdings Endpoints

### 1.1 `POST /holdings`
Add or update a holding in the portfolio.

* **Method:** `POST`
* **Path:** `/holdings`
* **Headers:** `Content-Type: application/json`

#### Request Body Schema
```json
{
  "stockSymbol": "TCS",
  "quantity": 10,
  "avgBuyPrice": 3800.50
}
```

#### Field Validation Rules
* `stockSymbol` (string, required): Non-empty, uppercase alphanumeric ticker symbol (e.g. `TCS`, `INFY`, `RELIANCE`). Converted to uppercase automatically.
* `quantity` (number, required): Integer or float strictly greater than 0 (`> 0`).
* `avgBuyPrice` (number, required): Float strictly greater than 0 (`> 0`).

#### Response: Success (200 OK or 201 Created)
```json
{
  "status": "ok",
  "message": "Holding updated successfully",
  "holding": {
    "userId": "default-user",
    "stockSymbol": "TCS",
    "quantity": 10,
    "avgBuyPrice": 3800.50,
    "sector": "IT",
    "addedAt": "2026-09-18T10:00:00.000Z",
    "updatedAt": "2026-09-18T10:00:00.000Z"
  }
}
```

---

### 1.2 `GET /holdings`
Retrieve all stored holdings for the user (raw holdings data, no live price or analysis computation).

* **Method:** `GET`
* **Path:** `/holdings`

#### Response: Success (200 OK)
```json
{
  "holdings": [
    {
      "stockSymbol": "TCS",
      "quantity": 10,
      "avgBuyPrice": 3800.50,
      "sector": "IT",
      "addedAt": "2026-09-18T10:00:00.000Z",
      "updatedAt": "2026-09-18T10:00:00.000Z",
      "lastKnownPrice": 4120.00,
      "lastFetchedAt": "2026-09-18T10:05:00.000Z"
    },
    {
      "stockSymbol": "HDFCBANK",
      "quantity": 25,
      "avgBuyPrice": 1600.00,
      "sector": "Banking",
      "addedAt": "2026-09-18T10:00:00.000Z",
      "updatedAt": "2026-09-18T10:00:00.000Z"
    }
  ]
}
```

---

### 1.3 `DELETE /holdings/{stockSymbol}`
Delete a single holding from the portfolio.

* **Method:** `DELETE`
* **Path:** `/holdings/{stockSymbol}`
* **Path Parameter:** `stockSymbol` (string, required) — Uppercase stock symbol e.g., `TCS`.

#### Response: Success (200 OK)
```json
{
  "status": "ok",
  "message": "Holding for TCS deleted successfully",
  "stockSymbol": "TCS"
}
```

#### Response: Not Found (404 Not Found)
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Holding for stockSymbol TCS was not found."
  }
}
```

---

## 2. Target Allocation Endpoints

### 2.1 `POST /targets`
Set or update target allocation percentage for a category or sector.

* **Method:** `POST`
* **Path:** `/targets`
* **Headers:** `Content-Type: application/json`

#### Request Body Schema
```json
{
  "targets": [
    { "category": "IT", "targetPercent": 30 },
    { "category": "Banking", "targetPercent": 40 },
    { "category": "Energy", "targetPercent": 30 }
  ]
}
```

#### Field Validation Rules
* `category` (string, required): Non-empty string representing sector name (e.g. `IT`, `Banking`, `Energy`) or overall category (`CASH`, `TOTAL_EQUITY`).
* `targetPercent` (number, required): Float between `0` and `100` inclusive.
* **Aggregated Validation Rule:** Sum of all target percentages must equal `100` (or warning flag returned if total != 100%).

#### Response: Success (200 OK)
```json
{
  "status": "ok",
  "message": "Target allocations updated successfully",
  "targets": [
    { "category": "IT", "targetPercent": 30 },
    { "category": "Banking", "targetPercent": 40 },
    { "category": "Energy", "targetPercent": 30 }
  ]
}
```

---

### 2.2 `GET /targets`
Retrieve all target allocations configured for the user.

* **Method:** `GET`
* **Path:** `/targets`

#### Response: Success (200 OK)
```json
{
  "targets": [
    { "category": "IT", "targetPercent": 30 },
    { "category": "Banking", "targetPercent": 40 },
    { "category": "Energy", "targetPercent": 30 }
  ]
}
```

---

## 3. Portfolio Analysis Endpoint

### 3.1 `GET /analysis`
Synchronously execute portfolio analysis, fetch live stock prices (or cached fallbacks), compute concentration risk & target drift, invoke the LLM for factual plain-language explanation, and return compiled dashboard analysis.

* **Method:** `GET`
* **Path:** `/analysis`

#### Response: Success (200 OK)
```json
{
  "totalValue": 152340.00,
  "totalInvested": 140000.00,
  "totalGainLoss": 12340.00,
  "gainLossPercent": 8.81,
  "holdings": [
    {
      "stockSymbol": "TCS",
      "quantity": 10,
      "avgBuyPrice": 3800.00,
      "currentPrice": 4120.00,
      "investedValue": 38000.00,
      "currentValue": 41200.00,
      "gainLoss": 3200.00,
      "gainLossPercent": 8.42,
      "weightPercent": 27.04,
      "sector": "IT",
      "isPriceCached": false,
      "lastFetchedAt": "2026-09-18T10:05:00.000Z"
    }
  ],
  "sectorBreakdown": {
    "IT": 54.00,
    "Banking": 22.00,
    "Energy": 24.00
  },
  "concentration": {
    "top1Percent": 27.04,
    "top3Percent": 68.04,
    "top1Symbol": "TCS",
    "flag": "high",
    "flagReason": "Top 3 holdings make up over 60% of the portfolio."
  },
  "targetDrift": [
    {
      "category": "IT",
      "targetPercent": 30.00,
      "actualPercent": 54.00,
      "driftPercent": 24.00
    },
    {
      "category": "Banking",
      "targetPercent": 40.00,
      "actualPercent": 22.00,
      "driftPercent": -18.00
    }
  ],
  "aiSummary": "Your portfolio holds a total value of ₹1,52,340 with a 54% weight in the IT sector, exceeding your 30% target. Top 3 holdings represent 68% of total portfolio value, indicating concentrated sector exposure."
}
```

#### Special Case: Empty Portfolio (200 OK)
```json
{
  "totalValue": 0,
  "totalInvested": 0,
  "totalGainLoss": 0,
  "gainLossPercent": 0,
  "holdings": [],
  "sectorBreakdown": {},
  "concentration": {
    "top1Percent": 0,
    "top3Percent": 0,
    "top1Symbol": null,
    "flag": "low",
    "flagReason": "Portfolio is empty."
  },
  "targetDrift": [],
  "aiSummary": "Your portfolio is currently empty. Add holdings to calculate valuation, sector weights, concentration risk, and target drift."
}
```
