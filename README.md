# Portfolio Health & Diversification Tracker

> A serverless AWS application telling retail investors, in plain language, how healthy and diversified their portfolio actually is — without ever giving buy/sell advice.

---

## 1. Project Overview

### Problem
Retail investors frequently accumulate stock holdings across multiple brokerages without a clear, aggregated view of:
* Portfolio concentration risk (single-stock or single-sector overload)
* Drift from their target asset allocation
* Real overall gain/loss across all holdings

Existing trading apps display raw numbers but rarely explain **what those numbers mean** for overall risk.

### Solution
Users enter stock holdings and optional target sector allocations. The system:
1. Fetches near-live stock prices (NSE/BSE).
2. Calculates current value, gain/loss, and portfolio weight percentages.
3. Evaluates concentration risk (top 1 & top 3 holdings) and target drift.
4. Uses an LLM (Bedrock in production, Gemini in dev) to generate a factual 2–4 sentence plain-language risk summary.
5. Employs a defensive post-generation check enforcing non-advisory compliance.

---

## 2. Technology Stack & Architecture

* **Frontend:** React 18 + Vite (TypeScript) + Tailwind CSS
* **Backend Runtime:** Node.js 20.x + TypeScript
* **Database:** Amazon DynamoDB (`Holdings`, `TargetAllocation`, `Snapshots`)
* **Infrastructure as Code:** AWS SAM (Serverless Application Model)
* **LLM Layer:** Amazon Bedrock (Production) / Google Gemini API (Development)
* **Market Data:** Yahoo Finance API wrapper with DynamoDB price cache fallback

---

## 3. Project Structure

```
bharatbuildsaws/
├── docs/                         # Architectural & API specifications
│   ├── architecture.md
│   ├── api-contract.md
│   ├── database.md
│   ├── implementation-plan.md
│   └── decisions.md
├── frontend/                     # React + Vite + Tailwind CSS Application
│   ├── src/
│   │   ├── components/           # UI Components (HoldingsForm, TargetAllocationForm, Dashboard)
│   │   ├── services/             # API integration service
│   │   ├── types/                # Frontend TypeScript types
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.ts
├── backend/                      # TypeScript Serverless Backend
│   ├── src/
│   │   ├── engine/               # Centralized Analysis Engine (computeAnalysis)
│   │   ├── handlers/             # AWS Lambda event handlers
│   │   ├── services/             # Market data & LLM provider adapters
│   │   ├── db/                   # DynamoDB access repositories
│   │   ├── config/               # Sector mapping dictionary
│   │   └── types/                # Domain TypeScript interfaces
│   ├── tests/                    # Unit and integration test suites
│   ├── package.json
│   └── tsconfig.json
├── infra/                        # Infrastructure as Code
│   └── template.yaml             # AWS SAM Infrastructure specification
├── .env.example                  # Environment configuration template
├── AGENTS.md                     # Project engineering specification & rules
├── portfolio-tracker-spec.md     # Product & architectural source of truth
└── README.md                     # Project documentation
```

---

## 4. Development Commands & Workflow

### Frontend
```bash
cd frontend
npm install        # Install frontend dependencies
npm run dev        # Launch Vite development server
npm run build      # Validate React TypeScript build
```

### Backend & Testing
```bash
cd backend
npm install        # Install backend dependencies
npm run build      # Compile TypeScript Lambda code to dist/
npm test           # Execute Vitest backend test suite
```

### Infrastructure (AWS SAM)
```bash
sam validate -t infra/template.yaml   # Validate SAM infrastructure specification
```
