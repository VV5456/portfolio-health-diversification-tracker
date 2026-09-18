# Architectural Decisions & Compliance Matrix

## 1. Summary of Architectural Decisions (ADRs)

### ADR-1: Application Stack & Runtime Selection
* **Status:** Approved Decision
* **Context:** Need a reliable, type-safe stack for backend Lambdas and a fast, responsive frontend UI with modern utility-first styling.
* **Decision:**
  * **Backend:** Node.js 20.x runtime with TypeScript. TypeScript guarantees type safety across domain models, API DTOs, calculation engine outputs, and DynamoDB items.
  * **Frontend:** React 18 + Vite with TypeScript and Tailwind CSS for styling.
  * **Infrastructure as Code:** AWS SAM (Serverless Application Model) for defining API Gateway, DynamoDB tables, Lambda functions, and EventBridge rules.
* **Impact:** Clean frontend styling system, consistent TypeScript interfaces across backend, and standard SAM serverless deployment workflow.

---

### ADR-2: Centralized Analysis Engine Decoupling
* **Status:** Specification Mandated
* **Context:** `portfolio-tracker-spec.md` Section 3.3 and `AGENTS.md` Task 5 dictate that the portfolio analysis calculation logic must be centralized and completely independent of Lambda handler execution contexts.
* **Decision:** Implement `computeAnalysis(userId)` in a pure TypeScript domain module (`backend/src/engine/computeAnalysis.ts`). Handlers for `GET /analysis` and EventBridge `scheduledAnalyzer` will import and invoke this exact function without duplicating math logic.
* **Impact:** 100% testable unit engine using deterministic mocked data without needing mock HTTP or Lambda context objects.

---

### ADR-3: Dual LLM Provider Architecture (Gemini Dev / Bedrock Production)
* **Status:** Specification Mandated
* **Context:** Development environment uses Google Gemini via API key; AWS production environment uses Amazon Bedrock. Prompt structure and defensive validation must be identical across both environments.
* **Decision:** Implement an `LLMService` interface with `GeminiAdapter` and `BedrockAdapter` implementations selected via `LLM_PROVIDER` environment variable. System prompts, input payload formats, and defensive keyword validation remain identical across both adapters.
* **Impact:** Zero code drift when transitioning from local Gemini prototyping to production Amazon Bedrock deployment.

---

### ADR-4: Price Provider Isolation & Fallback Caching Strategy
* **Status:** Specification Mandated
* **Context:** External free stock market data APIs (e.g. Yahoo Finance wrappers for NSE/BSE) may experience transient failures, network latency, or rate limits.
* **Decision:** Encapsulate market data fetching within `marketDataService.ts`. On API failure, retrieve `lastKnownPrice` and `lastFetchedAt` from the DynamoDB `Holdings` item, set `isPriceCached = true`, and log a warning without throwing a 500 error. On success, update `lastKnownPrice` and `lastFetchedAt` in DynamoDB.
* **Impact:** Dashboard remains 100% operational even during third-party price provider outages.

---

### ADR-5: Defensive Keyword Checks on LLM Summary Generation
* **Status:** Specification Mandated
* **Context:** Legal compliance (SEBI regulatory boundary in India) requires that the application never provide investment advice, buy/sell recommendations, or price targets.
* **Decision:** All LLM outputs pass through `llmValidator.ts`. If any banned term (e.g. `buy`, `sell`, `should invest`, `recommend`, `price target`) is detected in the response string, the engine rejects the generated text and substitutes a safe, deterministic template sentence.
* **Impact:** Prevents any accidental hallucination or regulatory non-compliance during live usage.

---

### ADR-6: Static Sector Lookup Table Strategy
* **Status:** Specification Mandated
* **Context:** Classifying stock symbols into sectors requires sector metadata without adding external paid API dependencies.
* **Decision:** Maintain a bundled JSON mapping (~50 prominent Indian stock tickers mapped to sectors) in `backend/src/config/sector-mapping.json`. Unlisted tickers default to sector `"Other"`.
* **Impact:** Zero operational cost for sector classification during MVP evaluation.

---

### ADR-7: Single Partition Key `userId = "default-user"` for Single-Tenant MVP
* **Status:** Proposed Decision
* **Context:** The MVP targets single-user demonstration without requiring complex authentication setup (Cognito/Auth0) initially.
* **Decision:** Use `"default-user"` as the default partition key (`userId`) across DynamoDB tables while preserving full `userId` indexing in schema definitions.
* **Impact:** Simple local development and demonstration while retaining immediate readiness for multi-tenant auth upgrades in future versions.

---

### ADR-8: Database & AWS SAM Infrastructure Foundation (TASK 2)
* **Status:** Implemented Decision
* **Context:** Infrastructure definition for DynamoDB database structures and serverless compute handlers required for MVP foundation.
* **Decision:**
  * Defined `PortfolioHoldings` table (PK: `userId`, SK: `stockSymbol`) with support for price caching (`lastKnownPrice`, `lastFetchedAt`) in `infra/template.yaml`.
  * Defined `PortfolioTargetAllocation` table (PK: `userId`, SK: `category`) in `infra/template.yaml`.
  * Excluded `SnapshotsTable` from `infra/template.yaml` to strictly enforce MVP scope boundaries (Snapshots infrastructure will be added if historical tracking is introduced post-MVP).
  * Wired API Gateway HTTP API and 7 serverless Lambda function scaffolding routes with least-privilege IAM policies (`DynamoDBReadPolicy`, `DynamoDBCrudPolicy`, Bedrock InvokeModel statement).
* **Impact:** Clean, minimal Infrastructure-as-Code (IaC) setup using AWS SAM adhering strictly to MVP boundary rules without unneeded resources.

---

## 2. Specification Mandated vs. Proposed Decisions Matrix

| Topic | Specification Requirement | Proposed Implementation Detail |
|---|---|---|
| **Portfolio Math** | Must calculate valuation, gain/loss, weights, sector breakdown, top 1 & top 3 concentration, target drift | Implemented in `backend/src/engine/computeAnalysis.ts` as pure functions with zero side effects |
| **Data Models** | `Holdings` table (PK: `userId`, SK: `stockSymbol`), `TargetAllocation` table (PK: `userId`, SK: `category`) | Node.js `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` v3 document client |
| **Price Integration** | Fetch live/near-live prices for Indian stocks, fallback to `lastKnownPrice` | Isolated in `marketDataService.ts` with Yahoo Finance wrapper & DynamoDB fallback |
| **LLM Guardrails** | Factual description only, 2-4 sentences, no buy/sell advice, banned term check | `llmValidator.ts` regex/keyword scanning with fallback template |
| **Frontend UI** | Entry forms for holdings & targets, dashboard displaying metrics & AI summary | React 18 + Vite SPA hosted on S3 / Amplify |
| **Backend Runtime** | AWS Lambda functions behind API Gateway | Node.js 20.x runtime with TypeScript |
| **Infrastructure** | Serverless AWS architecture | AWS SAM (`template.yaml`) for local invocation and deployment |
