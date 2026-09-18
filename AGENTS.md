# AGENTS.md

You are the lead software engineer for this project.

Read `portfolio-tracker-spec.md` before making architectural decisions.

The specification is the source of truth for product behavior.

---

# Development Rules

1. Build incrementally.
2. Do not implement multiple unrelated features in one task.
3. Do not invent features outside the MVP unless explicitly requested.
4. Keep business logic separate from Lambda handlers.
5. Keep the portfolio analysis computation centralized.
6. API contracts must be documented before implementation.
7. Never hardcode secrets.
8. Use environment variables for API keys and configuration.
9. Every backend feature must have tests.
10. Never expose AWS credentials or API keys to the frontend.
11. Never allow the LLM to provide investment advice.
12. Validate all LLM output using the defensive keyword check described in the specification.
13. Preserve the same LLM prompt structure between Gemini development and Bedrock production.
14. Prefer small, verifiable changes over large rewrites.
15. After each task, explain:
   - files changed
   - why they changed
   - how to run/test
   - what remains

When uncertain about behavior, consult `portfolio-tracker-spec.md` rather than inventing behavior.

---

# Project Development Workflow

The project must be developed through the following ordered tasks.

Do not automatically continue to the next task.

Complete one task, verify it, report the result, and wait for the next explicit instruction.

---

## TASK 0 — Architecture Review and Implementation Plan

Read the complete `portfolio-tracker-spec.md`.

Before writing application code:

1. Identify all required components.
2. Identify the data model.
3. Identify all API endpoints.
4. Identify the frontend views.
5. Identify external integrations.
6. Identify AWS services required by the specification.
7. Identify dependencies between components.
8. Propose the exact implementation stack and project structure.
9. Document important architectural decisions and any deviations from the specification.

Create:

- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/database.md`
- `docs/implementation-plan.md`
- `docs/decisions.md`

Do not create real AWS resources.

Do not begin implementation of later tasks.

---

## TASK 1 — Project Scaffolding

Create the initial application structure based on the architecture approved in TASK 0.

Create:

- frontend application
- backend/Lambda application structure
- infrastructure-as-code structure
- test structure
- shared configuration structure
- `.env.example`
- README documentation

Verify that:

- frontend starts/builds
- backend test environment runs
- infrastructure configuration is syntactically valid

Do not implement business logic.

Do not create real AWS resources.

---

## TASK 2 — AWS Infrastructure and Database Foundation

Implement the infrastructure required for the MVP database and API foundation.

Create the DynamoDB structures defined in the specification:

### Holdings

Partition key:
`userId`

Sort key:
`stockSymbol`

Required fields include:

- quantity
- avgBuyPrice
- sector
- addedAt
- updatedAt

Support the price-cache fields:

- lastKnownPrice
- lastFetchedAt

### TargetAllocation

Partition key:
`userId`

Sort key:
`category`

Field:

- targetPercent

The optional `Snapshots` table should not be implemented unless explicitly requested.

Do not implement frontend features yet.

Do not add unrelated AWS infrastructure.

---

## TASK 3 — Holdings Data Layer and API

Implement the holdings backend.

Support:

- add holding
- update holding
- retrieve holdings
- delete holding

Implement the following API contract:

`POST /holdings`

`GET /holdings`

`DELETE /holdings/{stockSymbol}`

Validate inputs.

Keep DynamoDB access separate from Lambda handlers.

Write backend tests.

---

## TASK 4 — Target Allocation API

Implement target allocation storage and API.

Support:

`POST /targets`

and the corresponding retrieval behavior required by the application.

Validate percentages.

Keep the target allocation data layer separate from Lambda handlers.

Write tests.

Do not implement analysis yet.

---

## TASK 5 — Portfolio Analysis Engine

Implement the centralized portfolio analysis function:

`computeAnalysis(userId)`

The calculation flow must follow the specification:

1. Read holdings.
2. Read targets.
3. Obtain current price for each holding.
4. Calculate current value.
5. Calculate invested value.
6. Calculate gain/loss.
7. Calculate holding weight.
8. Calculate sector breakdown.
9. Calculate concentration.
10. Calculate target drift.
11. Return a structured analysis object.

The analysis logic must be independent of the API Gateway/Lambda handler.

This is a critical architectural component.

Write comprehensive unit tests for calculations.

Use deterministic mocked prices during unit testing.

---

## TASK 6 — Market Price Integration

Implement the external stock-price integration.

Create a dedicated market-data service.

Do not spread provider-specific logic throughout the application.

The service must:

1. Fetch current/near-live stock prices.
2. Handle external API failure.
3. Fall back to `lastKnownPrice` when available.
4. Record when the price was last successfully fetched.
5. Clearly identify cached prices in the returned data.

Verify that the selected external provider works before relying on it.

Do not expose the provider API key to the frontend.

Write tests using mocked external responses.

---

## TASK 7 — Analysis API

Implement:

`GET /analysis`

This endpoint must invoke the centralized analysis engine and return the structured analysis defined in the specification.

The response must include, where applicable:

- totalValue
- totalInvested
- gainLossPercent
- holdings
- sectorBreakdown
- concentration
- targetDrift

Do not add LLM-generated text until TASK 8.

Write API tests.

---

## TASK 8 — LLM Explanation Layer

Implement the plain-language explanation layer.

Use the exact prompting constraints defined in `portfolio-tracker-spec.md`.

During development/testing, Gemini may be used.

Production must support Amazon Bedrock.

The LLM must receive computed analysis rather than raw holdings.

The prompt must enforce:

- descriptive behavior
- no investment advice
- no buy/sell recommendations
- no invented numbers
- 2–4 sentences
- calm, factual language

Implement post-generation validation using the banned-term strategy defined in the specification.

If validation fails, return a deterministic fallback explanation.

Keep provider-specific code isolated so Gemini and Bedrock can be swapped without changing the analysis engine.

Write tests for:

- valid output
- banned output
- malformed output
- fallback behavior

---

## TASK 9 — Frontend Application

Build the frontend views defined in the specification.

Required views:

1. Holdings entry form
2. Target allocation form
3. Dashboard

Dashboard should display:

- total portfolio value
- total invested
- total gain/loss
- holdings table
- current values
- holding weights
- gain/loss percentages
- sector breakdown
- concentration information
- AI explanation
- target drift

Use a clean, polished interface appropriate for a financial dashboard.

Do not add trading/order functionality.

Do not add investment recommendations.

---

## TASK 10 — Frontend/API Integration

Connect the frontend to the backend API.

Implement:

- adding holdings
- editing holdings
- deleting holdings
- setting targets
- loading analysis
- loading holdings
- loading error states
- loading states
- empty states

The frontend must never contain AWS credentials or secrets.

Test the complete flow:

frontend → API Gateway → Lambda → DynamoDB → analysis → response → frontend.

---

## TASK 11 — Scheduled Analysis and Digest

Implement the optional scheduled feature only after the core MVP is working.

Add:

EventBridge
→ analyzer Lambda
→ computeAnalysis()
→ digest generation
→ SES/SNS

The analyzer must reuse the same centralized analysis logic used by the dashboard.

Do not duplicate calculations.

Implement weekly scheduling.

Do not implement historical snapshots unless explicitly requested.

---

## TASK 12 — AWS Deployment

Deploy the completed application.

Deployment must include the required AWS services from the specification.

Verify:

- API Gateway endpoints
- Lambda functions
- DynamoDB tables
- Bedrock integration
- EventBridge schedule
- notification configuration
- frontend hosting

Use least-privilege IAM permissions.

Never use AWS root credentials for application resources.

Add an AWS budget alert before extensive testing.

---

## TASK 13 — End-to-End Testing and Demo Hardening

Create a realistic demo portfolio containing:

- 4–5 holdings
- at least 2–3 sectors
- a target allocation that differs from the current allocation

Verify the complete flow:

1. Add holdings.
2. View portfolio.
3. Fetch prices.
4. Calculate gain/loss.
5. Calculate concentration.
6. Calculate sector breakdown.
7. Calculate target drift.
8. Generate AI explanation.
9. Display dashboard.
10. Trigger scheduled digest if implemented.

Fix reliability, UI, validation, and error-handling issues found during testing.

Prepare the application for the final demo.

---

# MVP Boundary

The MVP must prioritize:

- holdings management
- live/near-live valuation
- gain/loss
- concentration analysis
- sector analysis
- target allocation
- target drift
- plain-language AI explanation
- working AWS deployment

Only implement these optional features after the MVP is fully functional:

- weekly digest
- historical snapshots
- historical charts
- multiple portfolios

---

# Completion Rule

After each task:

1. Stop.
2. Run relevant tests/build checks.
3. Report files created or changed.
4. Explain the implementation.
5. Explain how it was verified.
6. Report remaining issues or decisions.
7. Do not begin the next task automatically.

Wait for explicit instruction before continuing.