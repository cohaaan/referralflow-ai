# ReferralFlow AI - System Architecture

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vite + React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │Dashboard │  │Referrals │  │Bed Board │  │Settings  │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
└─────────────────────────────────────────────────────────────────────┘
                              ↕ HTTP/REST API
┌─────────────────────────────────────────────────────────────────────┐
│                      API SERVER (Fastify + TypeScript)               │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Routes: /referrals /facilities /analytics /beds /ai         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Services: Document, Criteria, Classification, Extraction    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKGROUND WORKERS (BullMQ)                       │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐   │
│  │   OCR    │→ │Classification│→ │Extraction│→ │AI Processing │   │
│  │  Worker  │  │   Worker     │  │  Worker  │  │ Orchestrator │   │
│  └──────────┘  └──────────────┘  └──────────┘  └──────────────┘   │
│       ↓              ↓                ↓               ↓             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              4 AI Agents (Run in Parallel)                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │   │
│  │  │Admissions│ │Reimburse-│ │ Clinical │ │Documentation │   │   │
│  │  │  Agent   │ │ment Agent│ │  Agent   │ │    Agent     │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │   AWS    │  │   AWS    │  │ Anthropic│  │   Redis  │            │
│  │    S3    │  │ Textract │  │  Claude  │  │  Queue   │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
└─────────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL + pgvector)                  │
│  Organizations, Facilities, Users, Referrals, Patients,             │
│  Documents, ExtractedData, AIRecommendations, RiskFlags,            │
│  Beds, Activities, AIProcessingLogs, Analytics                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Document Processing Pipeline

```
1. UPLOAD
   User uploads PDF → API receives file → Streams to S3
   ↓
2. OCR QUEUE
   Job added to Redis queue → OCR Worker picks up
   ↓
3. OCR PROCESSING
   Worker downloads from S3 → Sends to AWS Textract → Extracts text
   ↓
4. SAVE OCR RESULTS
   Text saved to Document table → Classification job queued
   ↓
5. CLASSIFICATION
   Classification Worker → Sends text to Claude → Identifies document type
   (e.g., "discharge_summary", "h_and_p", "medication_list")
   ↓
6. SAVE CLASSIFICATION
   Document type saved → Extraction job queued
   ↓
7. DATA EXTRACTION
   Extraction Worker → Sends all documents to Claude → Extracts structured data
   (Demographics, Diagnoses, Medications, Functional Status, etc.)
   ↓
8. SAVE EXTRACTED DATA
   Structured data saved to ExtractedPatientData table → AI Processing queued
   ↓
9. AI ORCHESTRATOR
   Orchestrator Worker → Runs 4 agents in parallel:
   
   ┌─────────────────────────────────────────────────────────────┐
   │  ADMISSIONS AGENT                                           │
   │  - Loads facility criteria                                  │
   │  - Evaluates patient against each rule                      │
   │  - Generates fit score (0-100)                              │
   │  - Creates deal-breaker flags                               │
   │  - Creates warning flags                                    │
   └─────────────────────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────────────────────┐
   │  REIMBURSEMENT AGENT                                        │
   │  - Analyzes payer type (Medicare A, Medicaid, etc.)         │
   │  - Calculates PDPM components (PT, OT, SLP, Nursing, NTA)   │
   │  - Estimates daily rate                                     │
   │  - Estimates length of stay                                 │
   │  - Calculates total revenue                                 │
   │  - Flags financial risks                                    │
   └─────────────────────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────────────────────┐
   │  CLINICAL AGENT                                             │
   │  - Analyzes clinical complexity                             │
   │  - Identifies special care needs                            │
   │  - Evaluates comorbidity risks                              │
   │  - Lists required equipment                                 │
   │  - Checks facility capabilities                             │
   └─────────────────────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────────────────────┐
   │  DOCUMENTATION AGENT                                        │
   │  - Generates patient summary                                │
   │  - Lists missing documents                                  │
   │  - Creates evidence citations                               │
   │  - Identifies information gaps                              │
   └─────────────────────────────────────────────────────────────┘
   
   ↓
10. AGGREGATE RESULTS
    Orchestrator combines all agent outputs:
    - Overall score = weighted average of fit scores
    - Recommendation = based on scores + deal-breakers
    - Rationale = summary of all findings
    ↓
11. SAVE RECOMMENDATION
    AIRecommendation record created with:
    - Recommendation (strong_accept, accept, review_required, decline, etc.)
    - Confidence score
    - All component scores
    - PDPM breakdown
    - Revenue estimates
    - Detailed rationale
    ↓
12. CREATE RISK FLAGS
    All flags from agents saved to RiskFlag table:
    - Deal-breakers (severity: critical)
    - Warnings (severity: high, medium, low)
    - Each with category, description, recommendation
    ↓
13. LOG AI PROCESSING
    Complete audit trail saved to AIProcessingLog:
    - Each agent's input/output
    - Tokens used
    - Processing time
    - Cost
    ↓
14. UPDATE REFERRAL STATUS
    Referral.status → "ready_for_decision"
    Referral.aiProcessingStatus → "completed"
    ↓
15. READY FOR HUMAN REVIEW
    User sees:
    - AI recommendation with confidence
    - Detailed rationale
    - Risk flags
    - Financial projections
    - Can accept, decline, or request more info
```

---

## 🔐 Data Flow

### Create Referral Flow
```
Frontend → POST /api/referrals → API Server → Database
                                      ↓
                                 Activity Log
                                      ↓
                                 Return Referral
```

### Upload Document Flow
```
Frontend → POST /api/referrals/:id/documents → API Server
                                                    ↓
                                              Upload to S3
                                                    ↓
                                           Save Document record
                                                    ↓
                                           Queue OCR job (Redis)
                                                    ↓
                                              Return success
```

### Background Processing Flow
```
OCR Worker → Poll Redis queue → Get job → Download from S3
                                              ↓
                                         Call Textract
                                              ↓
                                         Save OCR text
                                              ↓
                                    Queue Classification job
                                              ↓
Classification Worker → Poll queue → Get job → Call Claude
                                              ↓
                                      Save document type
                                              ↓
                                    Queue Extraction job
                                              ↓
Extraction Worker → Poll queue → Get job → Call Claude
                                              ↓
                                   Save extracted data
                                              ↓
                                Queue AI Processing job
                                              ↓
AI Orchestrator → Poll queue → Get job → Run 4 agents in parallel
                                              ↓
                                      Aggregate results
                                              ↓
                                   Save recommendation
                                              ↓
                                    Create risk flags
                                              ↓
                                   Log AI processing
                                              ↓
                                Update referral status
```

---

## 🗄️ Database Schema Overview

### Core Tables
- **Organization** - Multi-tenant support
- **Facility** - SNF facilities
- **User** - Staff members with roles
- **Referral** - Core referral records
- **Patient** - Patient demographics

### AI Processing Tables
- **Document** - Uploaded files with OCR status
- **ExtractedPatientData** - Structured data from AI
- **AIRecommendation** - AI decision with scores
- **RiskFlag** - Warnings and deal-breakers
- **AIProcessingLog** - Complete audit trail

### Operational Tables
- **Bed** - Bed inventory and status
- **Activity** - Timeline of events
- **FacilityCriteria** - Admission rules
- **DailyFacilityMetrics** - Analytics

---

## 🔧 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vite + React + TypeScript | UI |
| API | Fastify + TypeScript | REST API |
| Database | PostgreSQL 15 + pgvector | Data storage |
| Queue | Redis + BullMQ | Background jobs |
| Storage | AWS S3 | Document storage |
| OCR | AWS Textract | Text extraction |
| AI | Anthropic Claude 3.5 Sonnet | NLP, classification, extraction |
| ORM | Prisma | Database access |
| Container | Docker Compose | Local development |

---

## 📦 File Structure

```
referralflow-ai/
├── api/                          # Backend
│   ├── src/
│   │   ├── agents/              # AI agents (4 files)
│   │   ├── workers/             # Queue workers (4 files)
│   │   ├── services/            # Business logic
│   │   ├── routes/              # API endpoints
│   │   └── lib/                 # Utilities (S3, Textract, Claude, etc.)
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   └── seed.ts              # Seed data
│   └── .env                     # API keys
├── components/                   # Frontend components
├── services/                     # Frontend API client
├── docker-compose.yml           # PostgreSQL + Redis
└── package.json                 # Frontend dependencies
```

