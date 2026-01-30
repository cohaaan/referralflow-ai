# ReferralFlow AI

**AI-powered SNF (Skilled Nursing Facility) admissions platform** that automates document processing, patient data extraction, and admission recommendations using Claude AI and AWS services.

## 🎯 What This Does

ReferralFlow AI helps SNF admissions teams:
- 📄 **Process medical documents** automatically with OCR
- 🤖 **Extract patient data** using AI (diagnoses, medications, functional status)
- ✅ **Generate admission recommendations** with detailed rationale
- 💰 **Calculate financial projections** (PDPM scores, revenue estimates)
- 🚩 **Identify clinical risks** and deal-breakers
- 📊 **Track analytics** (acceptance rates, payer mix, trends)
- 🛏️ **Manage bed capacity** across facilities

## 📊 Current Status: ~70% Complete

✅ **Working:** AI pipeline, document processing, 4 AI agents, analytics, bed management
❌ **Missing:** Authentication, decision UI, criteria builder, notifications, tests

See **[PROJECT_STATUS.md](PROJECT_STATUS.md)** for detailed breakdown.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- API keys:
  - Anthropic (Claude) - https://console.anthropic.com/
  - AWS (S3 + Textract) - AWS IAM Console

### 1. Install Dependencies

```bash
# Frontend
npm install

# Backend
cd api
npm install
```

### 2. Configure Environment

Edit `api/.env` and add your API keys:

```bash
ANTHROPIC_API_KEY="sk-ant-your-key-here"
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
```

### 3. Start Services

```bash
# Terminal 1: Start Docker (PostgreSQL + Redis)
docker-compose up -d

# Terminal 2: Setup database and start API
cd api
npm run db:push
npm run dev

# Terminal 3: Start background workers
cd api
npm run workers:dev

# Terminal 4: Start frontend
npm run dev
```

### 4. Test It

1. Open http://localhost:3000
2. Create a referral
3. Upload a PDF document
4. Watch the AI pipeline process it (check Terminal 3 logs)
5. View the AI recommendation

See **[TESTING_GUIDE.md](TESTING_GUIDE.md)** for detailed testing instructions.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[SUMMARY.md](SUMMARY.md)** | Executive summary - start here! |
| **[PROJECT_STATUS.md](PROJECT_STATUS.md)** | Detailed status of all features |
| **[NEXT_STEPS.md](NEXT_STEPS.md)** | What to do next (authentication, decision UI, etc.) |
| **[TESTING_GUIDE.md](TESTING_GUIDE.md)** | How to test the AI pipeline |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System architecture and data flow |
| **[claude.md](claude.md)** | Original specification |

---

## 🏗️ Architecture

```
Frontend (Vite + React)
    ↕
API Server (Fastify)
    ↕
Background Workers (BullMQ)
    ├─ OCR Worker → AWS Textract
    ├─ Classification Worker → Claude AI
    ├─ Extraction Worker → Claude AI
    └─ AI Orchestrator → 4 AI Agents
        ├─ Admissions Agent
        ├─ Reimbursement Agent
        ├─ Clinical Agent
        └─ Documentation Agent
    ↕
Database (PostgreSQL)
Storage (AWS S3)
Queue (Redis)
```

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for detailed diagrams.

---

## 🔑 Key Features

### ✅ Implemented
- **Document Processing Pipeline**
  - Upload PDFs to S3
  - OCR with AWS Textract
  - Document classification (discharge summary, H&P, labs, etc.)
  - Structured data extraction (demographics, diagnoses, medications, etc.)

- **AI Decision Engine**
  - 4 specialized AI agents (Admissions, Reimbursement, Clinical, Documentation)
  - Criteria matching engine with 12+ operators
  - Risk flag generation with severity levels
  - PDPM scoring and revenue projections
  - Complete audit trails

- **Operational Features**
  - Referral management (CRUD)
  - Facility management
  - Bed tracking and census
  - Analytics dashboard
  - Activity timeline

### ❌ Not Yet Implemented
- Authentication (JWT/Clerk)
- Decision panel UI (Accept/Decline buttons)
- Criteria builder UI (visual rule editor)
- Notifications (email/in-app)
- Testing (unit + integration)
- HIPAA compliance hardening

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React + TypeScript + TailwindCSS |
| API | Fastify + TypeScript |
| Database | PostgreSQL 15 + Prisma ORM |
| Queue | Redis + BullMQ |
| Storage | AWS S3 |
| OCR | AWS Textract |
| AI | Anthropic Claude 3.5 Sonnet |
| Container | Docker Compose |

---

## 📁 Project Structure

```
referralflow-ai/
├── api/                          # Backend
│   ├── src/
│   │   ├── agents/              # AI agents (4 files)
│   │   ├── workers/             # Queue workers (4 files)
│   │   ├── services/            # Business logic
│   │   ├── routes/              # API endpoints
│   │   └── lib/                 # Utilities (S3, Textract, Claude)
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   └── seed.ts              # Seed data
│   └── .env                     # API keys (not in git)
├── components/                   # Frontend components
├── services/                     # Frontend API client
├── docker-compose.yml           # PostgreSQL + Redis
└── package.json                 # Frontend dependencies
```

---

## 🧪 Testing

See **[TESTING_GUIDE.md](TESTING_GUIDE.md)** for comprehensive testing instructions.

Quick test:
```bash
# Create a referral
curl -X POST http://localhost:4000/api/referrals \
  -H "Content-Type: application/json" \
  -d '{"facilityId":"...", "patientFirstName":"John", "patientLastName":"Doe"}'

# Upload a document
curl -X POST http://localhost:4000/api/referrals/{id}/documents \
  -F "file=@test.pdf"

# Check status
curl http://localhost:4000/api/referrals/{id}
```

---

## 💰 Cost Estimates

**Per 100 referrals/month:**
- AWS Textract: ~$15 (10 pages/referral)
- Anthropic Claude: ~$30 (classification + extraction + agents)
- AWS S3: ~$1
- **Total: ~$50/month**

---

## 🔒 Security Notes

⚠️ **IMPORTANT:** This application currently has **NO AUTHENTICATION**. All endpoints are public.

**Before production:**
- [ ] Implement authentication (see NEXT_STEPS.md)
- [ ] Enable HTTPS only
- [ ] Encrypt database
- [ ] Remove PHI from logs
- [ ] Add session timeout
- [ ] Get BAA from AWS & Anthropic

---

## 🎯 Next Steps

1. **Get API keys** (30 min) - Anthropic + AWS
2. **Test the pipeline** (1 hour) - Upload a document, watch it process
3. **Add authentication** (2-3 days) - JWT implementation
4. **Enhance decision UI** (1-2 days) - Accept/Decline buttons
5. **Build criteria builder** (3-4 days) - Visual rule editor

See **[NEXT_STEPS.md](NEXT_STEPS.md)** for detailed implementation guides.

---

## 📞 Support

**Common Issues:**
- Workers not processing → Check Redis is running
- OCR failing → Verify AWS credentials
- AI errors → Check Anthropic API key

**Debug Commands:**
```bash
docker ps                    # Check containers
redis-cli ping              # Check Redis
npm run db:push             # Sync database schema
```
