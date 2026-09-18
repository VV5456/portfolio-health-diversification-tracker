# Database Specification

## 1. Data Model Overview
The system uses **Amazon DynamoDB**, a managed NoSQL database service.

For the MVP, a single partition key (`userId = "default-user"`) is used for local single-tenant testing while maintaining full multi-tenant extensibility for future user authentication integrations.

---

## 2. DynamoDB Tables Schema

### 2.1 Table: `Holdings`
Stores user stock holdings along with buy price, sector, and cached market prices.

* **Billing Mode:** PAY_PER_REQUEST (On-Demand)
* **Partition Key (PK):** `userId` (String)
* **Sort Key (SK):** `stockSymbol` (String)

#### Attributes
| Attribute | DynamoDB Type | Required | Description | Example |
|---|---|---|---|---|
| `userId` | String (S) | Yes | Partition key for user identification | `"default-user"` |
| `stockSymbol` | String (S) | Yes | Sort key, stock ticker symbol (uppercase) | `"TCS"` |
| `quantity` | Number (N) | Yes | Total shares held | `10` |
| `avgBuyPrice` | Number (N) | Yes | Average buy price per share | `3800.50` |
| `sector` | String (S) | Yes | Industry sector classification | `"IT"` |
| `addedAt` | String (S) | Yes | ISO 8601 creation timestamp | `"2026-09-18T10:00:00.000Z"` |
| `updatedAt` | String (S) | Yes | ISO 8601 update timestamp | `"2026-09-18T10:00:00.000Z"` |
| `lastKnownPrice` | Number (N) | No | Last fetched market price (cache) | `4120.00` |
| `lastFetchedAt` | String (S) | No | ISO 8601 timestamp of last price fetch | `"2026-09-18T10:05:00.000Z"` |

#### Primary Access Patterns
1. **Get All Holdings:** `Query(PK = userId)` -> Returns list of holdings.
2. **Get Single Holding:** `GetItem(PK = userId, SK = stockSymbol)` -> Returns single holding.
3. **Put/Update Holding:** `PutItem` -> Adds new or updates existing holding.
4. **Delete Holding:** `DeleteItem(PK = userId, SK = stockSymbol)` -> Deletes holding.
5. **Update Price Cache:** `UpdateItem` -> Updates `lastKnownPrice` and `lastFetchedAt`.

---

### 2.2 Table: `TargetAllocation`
Stores target allocation percentages defined by the user per sector/category.

* **Billing Mode:** PAY_PER_REQUEST (On-Demand)
* **Partition Key (PK):** `userId` (String)
* **Sort Key (SK):** `category` (String)

#### Attributes
| Attribute | DynamoDB Type | Required | Description | Example |
|---|---|---|---|---|
| `userId` | String (S) | Yes | Partition key for user identification | `"default-user"` |
| `category` | String (S) | Yes | Sort key, sector name or category | `"IT"` |
| `targetPercent` | Number (N) | Yes | User target allocation percentage | `30` |
| `updatedAt` | String (S) | Yes | ISO 8601 update timestamp | `"2026-09-18T10:00:00.000Z"` |

#### Primary Access Patterns
1. **Get All Targets:** `Query(PK = userId)` -> Returns list of target allocation objects.
2. **Put/Update Target:** `PutItem` -> Saves target allocation for category.

---

### 2.3 Table: `Snapshots` (Nice-to-Have / Post-MVP)
Stores historical weekly portfolio snapshots for trend visualization.

> **Infrastructure Status Note:** As per MVP boundary rules, the `SnapshotsTable` resource is **not** included in the core AWS SAM infrastructure template (`infra/template.yaml`). If historical snapshot tracking is enabled post-MVP, this table schema and corresponding IAM permissions will be added to the infrastructure specification.

#### Schema Overview (For Future Implementation)
* **Billing Mode:** PAY_PER_REQUEST (On-Demand)
* **Partition Key (PK):** `userId` (String)
* **Sort Key (SK):** `snapshotDate` (String - ISO 8601 Date e.g., `"2026-09-18"`)
| Attribute | DynamoDB Type | Required | Description |
|---|---|---|---|
| `userId` | String (S) | Yes | Partition key |
| `snapshotDate` | String (S) | Yes | Sort key (YYYY-MM-DD) |
| `totalValue` | Number (N) | Yes | Total portfolio value at snapshot |
| `totalInvested` | Number (N) | Yes | Total invested capital at snapshot |
| `gainLossPercent` | Number (N) | Yes | Portfolio gain/loss percentage |
| `concentrationTop1Percent` | Number (N) | Yes | Weight of largest holding |
| `concentrationTop3Percent` | Number (N) | Yes | Combined weight of top 3 holdings |
| `sectorBreakdown` | Map (M) | Yes | Map of `{ "IT": 54.0, "Banking": 22.0 }` |

---

## 3. Sector Lookup Mapping Strategy

To avoid external paid sector data provider APIs, a static sector mapping file is bundled with the backend (`backend/src/config/sector-mapping.json`).

### Sector Lookup Table (~50 Indian Equities)
```json
{
  "TCS": "IT",
  "INFY": "IT",
  "WIPRO": "IT",
  "HCLTECH": "IT",
  "TECHM": "IT",
  "LTIM": "IT",
  "HDFCBANK": "Banking",
  "ICICIBANK": "Banking",
  "SBIN": "Banking",
  "KOTAKBANK": "Banking",
  "AXISBANK": "Banking",
  "INDUSINDBK": "Banking",
  "RELIANCE": "Energy",
  "ONGC": "Energy",
  "NTPC": "Energy",
  "POWERGRID": "Energy",
  "BPCL": "Energy",
  "ITC": "FMCG",
  "HUNVR": "FMCG",
  "NESTLEIND": "FMCG",
  "BRITANNIA": "FMCG",
  "TATAMOTORS": "Automobile",
  "M&M": "Automobile",
  "MARUTI": "Automobile",
  "BAJAJ-AUTO": "Automobile",
  "HEROMOTOCO": "Automobile",
  "SUNPHARMA": "Pharmaceuticals",
  "DRREDDY": "Pharmaceuticals",
  "CIPLA": "Pharmaceuticals",
  "DIVISLAB": "Pharmaceuticals",
  "TATASTEEL": "Metals",
  "JSWSTEEL": "Metals",
  "HINDALCO": "Metals",
  "LT": "Infrastructure",
  "ULTRACEMCO": "Cement",
  "ASIANPAINT": "Consumer Durables",
  "TITAN": "Consumer Durables",
  "BHARTIARTL": "Telecom"
}
```

*If a stock symbol is not present in the lookup map, the sector defaults to `"Other"`.*

---

## 4. Price Caching & Fallback Architecture

```
[Market Price Integration Flow]
            │
            ▼
    Fetch live price via Yahoo Finance API
            │
      ┌─────┴─────┐
   Success?     Failed?
      │           │
      YES         NO
      │           │
      ▼           ▼
Update price     Read lastKnownPrice
& update         from DynamoDB Holdings
lastFetchedAt     Set isPriceCached = true
Set isPriceCached = false
```
