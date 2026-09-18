# Project Implementation Plan

## 1. Executive Summary & Proposed Stack
This implementation plan breaks down the development of the **Portfolio Health & Diversification Tracker** into strictly isolated, incremental tasks (TASK 0 to TASK 13) as specified in `AGENTS.md`.

### Selected Technology Stack
* **Frontend:** React 18 / TypeScript powered by Vite, Tailwind CSS, Chart.js for visual sector breakdown.
* **Backend Runtime:** Node.js 20.x runtime with TypeScript for AWS Lambda functions.
* **Database:** AWS DynamoDB (On-Demand billing mode).
* **LLM Provider:** Amazon Bedrock (Production AWS) / Google Gemini API (Development & Local Testing).
* **IaC Framework:** AWS SAM (Serverless Application Model) for infrastructure as code and local testing.
* **Testing:** Jest / Vitest for backend calculation engine unit tests and API integration tests.

---

## 2. Target Directory & Project Structure

```
bharatbuildsaws/
├── docs/
│   ├── architecture.md
│   ├── api-contract.md
│   ├── database.md
│   ├── implementation-plan.md
│   └── decisions.md
├── frontend/                     # React + Vite application
│   ├── public/
│   ├── src/
│   │   ├── components/           # UI components (Forms, Dashboard Cards, Tables)
│   │   ├── services/             # API client service calls
│   │   ├── types/                # TypeScript interface definitions
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── backend/                      # Node.js + TypeScript Lambda backend
│   ├── src/
│   │   ├── handlers/             # Lambda handlers (holdings, targets, analysis)
│   │   │   ├── saveHoldings.ts
│   │   │   ├── getHoldings.ts
│   │   │   ├── deleteHolding.ts
│   │   │   ├── saveTargets.ts
│   │   │   ├── getTargets.ts
│   │   │   ├── getAnalysis.ts
│   │   │   └── scheduledAnalyzer.ts
│   │   ├── engine/               # Centralized calculation engine (decoupled)
│   │   │   └── computeAnalysis.ts
│   │   ├── services/             # External service adapters
│   │   │   ├── marketDataService.ts
│   │   │   ├── llmService.ts
│   │   │   │   ├── geminiAdapter.ts
│   │   │   │   ├── bedrockAdapter.ts
│   │   │   │   └── llmValidator.ts
│   │   │   └── notificationService.ts
│   │   ├── db/                   # DynamoDB access layer (repositories)
│   │   │   ├── holdingsRepository.ts
│   │   │   └── targetsRepository.ts
│   │   ├── config/               # Sector mapping & constants
│   │   │   └── sector-mapping.json
│   │   └── types/                # Shared domain types & DTOs
│   ├── tests/                    # Unit and integration tests
│   │   ├── engine/
│   │   │   └── computeAnalysis.test.ts
│   │   ├── services/
│   │   │   ├── marketDataService.test.ts
│   │   │   └── llmService.test.ts
│   │   └── handlers/
│   ├── package.json
│   └── tsconfig.json
├── infra/                        # Infrastructure as Code (AWS SAM template)
│   └── template.yaml
├── .env.example
├── README.md
└── AGENTS.md
```

---

## 3. Implementation Task Breakdown

### TASK 0 — Architecture Review and Implementation Plan (CURRENT)
* **Goal:** Document architecture, API contract, database schema, implementation plan, and architectural decisions.
* **Verification:** Verify all 5 documentation files exist under `docs/` and adhere to `AGENTS.md` requirements. No application code or AWS resources created.

---

### TASK 1 — Project Scaffolding
* **Goal:** Create initial application directory structure, configuration files, `.env.example`, and test frameworks without implementing business logic.
* **Artifacts to create:** `frontend/`, `backend/`, `infra/`, `.env.example`, `README.md`.
* **Verification:** Frontend runs (`npm run dev`), backend tests runner passes (`npm test`), IaC configuration (`template.yaml`) is syntactically valid.

---

### TASK 2 — AWS Infrastructure and Database Foundation
* **Goal:** Define DynamoDB infrastructure schemas (`Holdings` and `TargetAllocation`) in IaC and local DynamoDB mock layer.
* **Verification:** IaC template defines required PK/SK attributes for `Holdings` and `TargetAllocation` correctly.

---

### TASK 3 — Holdings Data Layer and API
* **Goal:** Implement holdings backend handlers (`POST /holdings`, `GET /holdings`, `DELETE /holdings/{stockSymbol}`) and DynamoDB repository abstraction.
* **Verification:** Write backend unit tests verifying validation rules, CRUD operations against mock DynamoDB layer.

---

### TASK 4 — Target Allocation API
* **Goal:** Implement target allocation backend handlers (`POST /targets`, `GET /targets`) and target repository abstraction.
* **Verification:** Write unit tests verifying target percentage validation (0–100 range) and persistence.

---

### TASK 5 — Portfolio Analysis Engine
* **Goal:** Implement the centralized domain function `computeAnalysis(userId)`.
* **Flow:** Read holdings -> Read targets -> Fetch prices -> Calculate current & invested value -> Calculate weights & gain/loss % -> Compute sector breakdown -> Compute concentration -> Compute target drift.
* **Verification:** Write comprehensive Jest unit tests using deterministic mocked prices covering edge cases (single stock, multi-sector, zero targets, high concentration).

---

### TASK 6 — Market Price Integration
* **Goal:** Create `marketDataService.ts` wrapping external stock price API (Yahoo Finance) with DynamoDB `lastKnownPrice` fallback and caching.
* **Verification:** Write unit tests for successful price fetch, provider failure fallback, and cache update behavior.

---

### TASK 7 — Analysis API
* **Goal:** Wire `GET /analysis` Lambda handler to `computeAnalysis(userId)` and return structured portfolio analysis JSON (without LLM explanation text).
* **Verification:** Write API handler unit tests verifying structured analysis JSON output matching API contract.

---

### TASK 8 — LLM Explanation Layer
* **Goal:** Implement `llmService.ts` with Gemini (Dev) and Bedrock (Prod) adapters, strict system prompt, 2–4 sentence constraint, and defensive keyword validation fallback.
* **Verification:** Write unit tests for valid LLM response, banned keyword detection (triggering safe fallback), and error handling.

---

### TASK 9 — Frontend Application
* **Goal:** Build React frontend UI components: Holdings Entry Form, Target Allocation Form, and Dashboard (valuation cards, holdings table, sector breakdown, concentration banner, target drift table, AI summary card).
* **Verification:** Verify frontend components render cleanly, validate input fields, and present responsive financial dashboard.

---

### TASK 10 — Frontend/API Integration
* **Goal:** Connect React frontend client to API Gateway endpoints for full end-to-end user interaction.
* **Verification:** Execute end-to-end local workflow: add holdings -> set targets -> load dashboard -> view live prices, gain/loss, concentration, target drift, and AI summary.

---

### TASK 11 — Scheduled Analysis and Digest (Optional)
* **Goal:** Implement `scheduledAnalyzer` Lambda triggered by EventBridge cron rule to run `computeAnalysis` and dispatch weekly digest via SNS/SES.
* **Verification:** Test scheduled analyzer invocation with mock SNS/SES sender.

---

### TASK 12 — AWS Deployment
* **Goal:** Deploy application stack to AWS using SAM/CDK (API Gateway, Lambda functions, DynamoDB tables, S3 static website hosting, Bedrock IAM permissions).
* **Verification:** Verify deployed live endpoints, DynamoDB tables, and budget alerts in AWS Console.

---

### TASK 13 — End-to-End Testing and Demo Hardening
* **Goal:** Populate demo portfolio (4–5 holdings, 2–3 sectors, target drift) and verify complete operational flow on deployed system.
* **Verification:** Validate full end-to-end user journey live on deployed web app and document walkthrough.

---

## 4. MVP Boundary & Rules Reminder
* **Included in MVP:** Holdings CRUD, target allocation, live valuation, gain/loss calculation, concentration analysis, sector breakdown, target drift, plain-language AI explanation, working frontend dashboard, AWS deployment.
* **Deferred Post-MVP:** Weekly email digest (Task 11), historical snapshots, historical trend charts, multi-portfolio support.
