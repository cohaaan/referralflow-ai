# ExaCare Clone - Complete Build Specification

<project_overview>
Build an AI-powered SNF (Skilled Nursing Facility) admissions platform that:
1. Aggregates patient referrals from multiple sources (fax, email, manual upload)
2. Uses OCR + AI to extract structured data from medical documents
3. Matches patients against facility-specific admission criteria
4. Recommends accept/decline with transparent rationale and audit trails
5. Tracks beds, census, and analytics across the portfolio

Target users: Admissions Directors, Coordinators, DONs, Facility Administrators
</project_overview>

<tech_stack>
Frontend:     Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui
Backend:      Node.js + Fastify + TypeScript
Database:     PostgreSQL 15+ with pgvector extension
Cache/Queue:  Redis + BullMQ
Storage:      AWS S3 (documents)
OCR:          AWS Textract
AI/LLM:       Claude 3.5 Sonnet (Anthropic API)
Auth:         Clerk (HIPAA-compliant) or custom JWT
</tech_stack>

<constraints>
IMPORTANT - Follow these rules strictly:

1. Avoid over-engineering. Only make changes that are directly requested or clearly necessary.
2. Keep solutions simple and focused. Don't add features beyond what's specified.
3. Don't create helpers, utilities, or abstractions for one-time operations.
4. Don't design for hypothetical future requirements.
5. Reuse existing abstractions where possible. Follow DRY principle.
6. ALWAYS read and understand relevant files before proposing code edits.
7. Do not speculate about code you have not inspected.
8. Write tests before implementation for complex logic.
9. Never hard-code values or create solutions that only work for specific test inputs.
10. If something is unclear, ask rather than assume.
</constraints>

---

# PHASE 1: Foundation (Week 1-2)

<phase_1_tasks>
## 1.1 Project Setup

```bash
# Create project
mkdir exacare-clone && cd exacare-clone
pnpm init

# Create structure
mkdir -p apps/web apps/api packages/shared

# Initialize Next.js frontend
cd apps/web
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
pnpm dlx shadcn@latest init
pnpm add @tanstack/react-query zustand react-hook-form zod @hookform/resolvers date-fns lucide-react recharts

# Initialize API
cd ../api
pnpm init
pnpm add fastify @fastify/cors @fastify/multipart @prisma/client bullmq ioredis zod @anthropic-ai/sdk @aws-sdk/client-textract @aws-sdk/client-s3
pnpm add -D typescript @types/node prisma ts-node nodemon
npx prisma init

# Docker for local dev
cd ../..
```

## 1.2 Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: exacare
      POSTGRES_PASSWORD: exacare
      POSTGRES_DB: exacare
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 1.3 Environment Variables

Create `.env`:
```bash
DATABASE_URL="postgresql://exacare:exacare@localhost:5432/exacare"
REDIS_URL="redis://localhost:6379"
ANTHROPIC_API_KEY="sk-ant-..."
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
S3_BUCKET_NAME="exacare-documents"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
```

## 1.4 Success Criteria Phase 1
- [ ] Docker containers running (Postgres + Redis)
- [ ] Next.js app loads at localhost:3000
- [ ] API server runs at localhost:4000
- [ ] Prisma connected to database
- [ ] Basic auth working (login/register)
</phase_1_tasks>

---

# DATABASE SCHEMA

<database_schema>
Use this complete PostgreSQL schema. Convert to Prisma if preferred.

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enums
CREATE TYPE user_role AS ENUM (
    'super_admin', 'org_admin', 'facility_admin',
    'admissions_director', 'admissions_coordinator',
    'clinical_reviewer', 'billing_specialist', 'viewer'
);

CREATE TYPE referral_status AS ENUM (
    'new', 'processing', 'pending_review', 'under_review', 'pending_info',
    'ready_for_decision', 'accepted', 'declined', 'waitlisted',
    'withdrawn', 'expired', 'admitted'
);

CREATE TYPE payer_type AS ENUM (
    'medicare_a', 'medicare_b', 'medicare_advantage',
    'medicaid', 'medicaid_pending', 'managed_care',
    'commercial', 'workers_comp', 'private_pay', 'va', 'other'
);

CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE ai_recommendation_type AS ENUM (
    'strong_accept', 'accept', 'accept_with_conditions',
    'review_required', 'decline', 'strong_decline'
);

CREATE TYPE bed_status AS ENUM (
    'available', 'occupied', 'reserved', 'cleaning', 'maintenance', 'blocked'
);

CREATE TYPE document_type AS ENUM (
    'face_sheet', 'h_and_p', 'discharge_summary', 'medication_list', 'mar',
    'physician_orders', 'labs', 'imaging', 'consult_notes', 'nursing_notes',
    'therapy_notes', 'wound_photos', 'insurance_card', 'authorization', 'other'
);

CREATE TYPE capability_type AS ENUM (
    'ventilator', 'tracheostomy', 'wound_care_stage_3_4', 'wound_vac',
    'iv_therapy', 'picc_line', 'central_line', 'tpn',
    'dialysis_transport', 'on_site_dialysis', 'peritoneal_dialysis',
    'bariatric_400lb', 'bariatric_500lb', 'bariatric_600lb',
    'isolation_room', 'negative_pressure_room', 'airborne_isolation',
    'behavioral_health', 'memory_care', 'secured_unit', 'one_to_one',
    'hospice', 'respite',
    'physical_therapy', 'occupational_therapy', 'speech_therapy',
    'respiratory_therapy', 'cardiac_rehab'
);

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Facilities
CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(50) NOT NULL,
    npi VARCHAR(10),
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    phone VARCHAR(20),
    fax VARCHAR(20),
    total_beds INTEGER,
    licensed_beds INTEGER,
    medicare_certified BOOLEAN DEFAULT false,
    medicaid_certified BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Facility Capabilities (tracks what services facility can provide with capacity)
CREATE TABLE facility_capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    capability capability_type NOT NULL,
    is_available BOOLEAN DEFAULT true,
    max_capacity INTEGER,
    current_census INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(facility_id, capability)
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Facility access (many-to-many)
CREATE TABLE user_facility_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    access_level VARCHAR(50) DEFAULT 'full',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, facility_id)
);

-- Admission Criteria Templates
CREATE TABLE criteria_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    rule_definition JSONB NOT NULL,
    is_recommended BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Facility-specific Criteria
CREATE TABLE facility_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    template_id UUID REFERENCES criteria_templates(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    rule_definition JSONB NOT NULL,
    priority INTEGER DEFAULT 100,
    weight INTEGER DEFAULT 1,
    is_deal_breaker BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals (core table)
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    
    -- Source tracking
    referral_source VARCHAR(100),
    external_referral_id VARCHAR(255),
    referring_facility_name VARCHAR(255),
    case_manager_name VARCHAR(255),
    case_manager_phone VARCHAR(20),
    case_manager_email VARCHAR(255),
    
    -- Patient basics
    patient_first_name VARCHAR(100),
    patient_last_name VARCHAR(100),
    patient_dob DATE,
    patient_gender VARCHAR(20),
    
    -- Status
    status referral_status DEFAULT 'new',
    substatus VARCHAR(100),
    
    -- AI processing
    ai_processing_status VARCHAR(50) DEFAULT 'pending',
    ai_processing_started_at TIMESTAMPTZ,
    ai_processing_completed_at TIMESTAMPTZ,
    ai_processing_error TEXT,
    
    -- Assignment
    assigned_to UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ,
    
    -- Timestamps
    received_at TIMESTAMPTZ DEFAULT NOW(),
    first_response_at TIMESTAMPTZ,
    target_admission_date DATE,
    actual_admission_date DATE,
    decision_at TIMESTAMPTZ,
    decision_by UUID REFERENCES users(id),
    
    -- Priority
    priority VARCHAR(20) DEFAULT 'normal',
    priority_score INTEGER,
    is_urgent BOOLEAN DEFAULT false,
    
    -- Final decision
    final_decision ai_recommendation_type,
    decision_reason TEXT,
    decline_reason_category VARCHAR(100),
    
    -- AI recommendation tracking
    ai_recommendation ai_recommendation_type,
    ai_confidence_score DECIMAL(5,4),
    followed_ai_recommendation BOOLEAN,
    override_reason TEXT,
    
    tags TEXT[],
    internal_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referrals_facility ON referrals(facility_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_received ON referrals(received_at DESC);

-- Patients
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    age INTEGER,
    gender VARCHAR(20),
    ssn_last_four VARCHAR(4),
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    primary_language VARCHAR(50) DEFAULT 'English',
    interpreter_needed BOOLEAN DEFAULT false,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extracted Patient Data (AI output)
CREATE TABLE extracted_patient_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    extraction_version VARCHAR(50),
    model_used VARCHAR(100),
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    overall_confidence DECIMAL(5,4),
    
    -- All stored as JSONB
    clinical_summary JSONB,
    diagnoses JSONB,
    medications JSONB,
    functional_status JSONB,
    care_requirements JSONB,
    behavioral_status JSONB,
    labs JSONB,
    vitals JSONB,
    insurance_info JSONB,
    discharge_info JSONB,
    
    raw_extraction_output JSONB,
    clinical_embedding vector(1536),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Recommendations
CREATE TABLE ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    
    recommendation ai_recommendation_type NOT NULL,
    confidence_score DECIMAL(5,4),
    
    overall_score INTEGER,
    clinical_fit_score INTEGER,
    financial_fit_score INTEGER,
    operational_fit_score INTEGER,
    
    pdpm_components JSONB,
    estimated_daily_rate DECIMAL(10,2),
    estimated_los_days INTEGER,
    estimated_total_revenue DECIMAL(12,2),
    
    positive_factors JSONB,
    missing_info JSONB,
    review_questions TEXT[],
    
    summary TEXT,
    detailed_rationale TEXT,
    
    model_version VARCHAR(50),
    processing_time_ms INTEGER,
    tokens_used INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk Flags (dedicated table with resolution tracking)
CREATE TABLE risk_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    
    category VARCHAR(100) NOT NULL,
    flag_type VARCHAR(100) NOT NULL,
    severity risk_level NOT NULL,
    is_deal_breaker BOOLEAN DEFAULT false,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    recommendation TEXT,
    
    source_agent VARCHAR(50),
    source_criteria_id UUID REFERENCES facility_criteria(id),
    source_document_id UUID,
    source_excerpt TEXT,
    
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risk_flags_referral ON risk_flags(referral_id);
CREATE INDEX idx_risk_flags_unresolved ON risk_flags(referral_id) WHERE is_resolved = false;

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    
    original_filename VARCHAR(255),
    file_type VARCHAR(50),
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    storage_bucket VARCHAR(100),
    storage_path VARCHAR(500) NOT NULL,
    
    document_type document_type,
    document_type_confidence DECIMAL(5,4),
    
    ocr_status VARCHAR(50) DEFAULT 'pending',
    ocr_completed_at TIMESTAMPTZ,
    ocr_text TEXT,
    ocr_confidence DECIMAL(5,4),
    
    page_count INTEGER,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Processing Log (audit trail)
CREATE TABLE ai_processing_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    
    agent_name VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    
    input_summary TEXT,
    output_summary TEXT,
    full_input JSONB,
    full_output JSONB,
    
    model_used VARCHAR(100),
    tokens_input INTEGER,
    tokens_output INTEGER,
    processing_time_ms INTEGER,
    cost_usd DECIMAL(10,6),
    
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Beds
CREATE TABLE beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    unit_name VARCHAR(100),
    room_number VARCHAR(20),
    bed_identifier VARCHAR(20),
    bed_type VARCHAR(50),
    capabilities capability_type[],
    is_private_room BOOLEAN DEFAULT false,
    status bed_status DEFAULT 'available',
    current_patient_id UUID,
    reserved_for_referral_id UUID REFERENCES referrals(id),
    reserved_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Census Snapshots
CREATE TABLE census_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    total_beds INTEGER,
    occupied_beds INTEGER,
    available_beds INTEGER,
    reserved_beds INTEGER,
    medicare_count INTEGER DEFAULT 0,
    medicaid_count INTEGER DEFAULT 0,
    managed_care_count INTEGER DEFAULT 0,
    private_pay_count INTEGER DEFAULT 0,
    occupancy_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(facility_id, snapshot_date)
);

-- Activities
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(100) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    is_system_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    action_details JSONB,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Facility Metrics
CREATE TABLE daily_facility_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    referrals_received INTEGER DEFAULT 0,
    referrals_accepted INTEGER DEFAULT 0,
    referrals_declined INTEGER DEFAULT 0,
    avg_response_time_minutes INTEGER,
    current_census INTEGER,
    available_beds INTEGER,
    medicare_admissions INTEGER DEFAULT 0,
    medicaid_admissions INTEGER DEFAULT 0,
    estimated_revenue_accepted DECIMAL(12,2),
    metrics_by_source JSONB,
    decline_reasons JSONB,
    ai_recommendations_followed INTEGER DEFAULT 0,
    ai_recommendations_overridden INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(facility_id, metric_date)
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    entity_type VARCHAR(100),
    entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Useful Views
CREATE OR REPLACE VIEW v_referral_dashboard AS
SELECT 
    r.id,
    r.facility_id,
    r.status,
    r.priority,
    r.is_urgent,
    r.received_at,
    r.ai_recommendation,
    r.ai_confidence_score,
    p.first_name || ' ' || p.last_name AS patient_name,
    p.date_of_birth,
    ar.estimated_daily_rate,
    ar.overall_score,
    (SELECT COUNT(*) FROM risk_flags rf WHERE rf.referral_id = r.id AND rf.is_resolved = false) AS unresolved_flags
FROM referrals r
LEFT JOIN patients p ON p.referral_id = r.id
LEFT JOIN ai_recommendations ar ON ar.referral_id = r.id;

-- Auto-update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_referrals_updated BEFORE UPDATE ON referrals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_patients_updated BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_extracted_updated BEFORE UPDATE ON extracted_patient_data FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```
</database_schema>

---

# PHASE 2: Referral Core (Week 3-4)

<phase_2_tasks>
## 2.1 Referral CRUD API

Create these endpoints:
```
POST   /api/referrals              # Create referral
GET    /api/referrals              # List with filters (status, facility, date range)
GET    /api/referrals/:id          # Get detail
PATCH  /api/referrals/:id          # Update
DELETE /api/referrals/:id          # Soft delete

POST   /api/referrals/:id/documents    # Upload document
GET    /api/referrals/:id/documents    # List documents
GET    /api/referrals/:id/timeline     # Activity timeline
POST   /api/referrals/:id/comments     # Add comment
POST   /api/referrals/:id/assign       # Assign to user
```

## 2.2 Document Upload Flow

1. Accept multipart file upload
2. Validate file type (PDF, images)
3. Stream to S3 (don't buffer in memory)
4. Save document record with storage_path
5. Queue for OCR processing

## 2.3 Frontend Pages

Create these pages:
- `/dashboard` - Overview with metrics cards
- `/referrals` - Queue list with filters, sorting
- `/referrals/[id]` - Detail page with tabs (Overview, Documents, AI Analysis, Activity)

## 2.4 Success Criteria Phase 2
- [ ] Can create referral manually
- [ ] Can upload PDF documents
- [ ] Documents stored in S3
- [ ] Referral list shows with filters
- [ ] Referral detail page renders
</phase_2_tasks>

---

# PHASE 3: AI Pipeline (Week 5-7)

<phase_3_tasks>
## 3.1 Processing Architecture

```
[Upload] → [S3] → [OCR Queue] → [OCR Worker] → [Classification Queue]
                                                      ↓
[UI Display] ← [Save Results] ← [Orchestrator] ← [Extraction Queue]
```

## 3.2 OCR Worker (AWS Textract)

```typescript
// workers/ocr.worker.ts
import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';

async function processDocument(documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  
  // Get file from S3
  const s3Response = await s3.getObject({
    Bucket: doc.storage_bucket,
    Key: doc.storage_path
  });
  
  // Run Textract
  const textract = new TextractClient({ region: process.env.AWS_REGION });
  const result = await textract.send(new AnalyzeDocumentCommand({
    Document: { Bytes: await s3Response.Body.transformToByteArray() },
    FeatureTypes: ['TABLES', 'FORMS']
  }));
  
  // Extract text
  const text = result.Blocks
    .filter(b => b.BlockType === 'LINE')
    .map(b => b.Text)
    .join('\n');
  
  // Save result
  await prisma.document.update({
    where: { id: documentId },
    data: {
      ocr_status: 'completed',
      ocr_text: text,
      ocr_completed_at: new Date()
    }
  });
  
  // Queue for classification
  await classificationQueue.add({ documentId });
}
```

## 3.3 Document Classification Prompt

```typescript
const CLASSIFICATION_PROMPT = `Classify this medical document into exactly ONE category:

CATEGORIES:
- H_AND_P: History and Physical
- DISCHARGE_SUMMARY: Hospital discharge summary
- FACE_SHEET: Patient demographics/admission face sheet
- MEDICATION_LIST: List of current medications
- LABS: Laboratory results
- CONSULT_NOTES: Specialist consultation notes
- NURSING_NOTES: Nursing assessment or progress notes
- INSURANCE_CARD: Insurance information
- OTHER: Does not fit above

DOCUMENT TEXT (first 3000 chars):
---
{documentText}
---

Return ONLY JSON: {"type": "CATEGORY_NAME", "confidence": 0.95}`;
```

## 3.4 Data Extraction Prompt

```typescript
const EXTRACTION_PROMPT = `Extract structured patient data from these medical documents.

GUIDELINES:
- Extract ICD-10 codes exactly as written (e.g., "I50.9")
- BIMS score is 0-15 scale
- Flag high-cost medications (biologics, specialty meds, IV antibiotics >$500/month)
- If information not found, use null - do not guess
- Dates in ISO format YYYY-MM-DD

DOCUMENTS:
---
{documents}
---

Return this JSON structure:

{
  "demographics": {
    "firstName": "string|null",
    "lastName": "string|null",
    "dob": "YYYY-MM-DD|null",
    "age": "number|null",
    "gender": "male|female|other|null",
    "primaryLanguage": "string|null",
    "interpreterNeeded": "boolean"
  },
  "clinicalSummary": {
    "chiefComplaint": "string|null",
    "hospitalCourseSummary": "string (2-3 sentences)|null",
    "codeStatus": "Full Code|DNR|DNR/DNI|Comfort Care|null",
    "isolationPrecautions": "None|Contact|Droplet|Airborne|null"
  },
  "diagnoses": [
    {
      "icd10Code": "string",
      "description": "string",
      "type": "primary|secondary",
      "onset": "acute|chronic|null"
    }
  ],
  "medications": [
    {
      "name": "string",
      "dose": "string|null",
      "route": "PO|IV|IM|SQ|Topical|Inhaled|Other",
      "frequency": "string|null",
      "isHighCost": "boolean",
      "requiresMonitoring": "boolean"
    }
  ],
  "functionalStatus": {
    "mobility": "Independent|Supervision|1 Person Assist|2 Person Assist|Non-ambulatory|null",
    "bimsScore": "number 0-15|null",
    "fallRisk": "Low|Moderate|High|null",
    "weightLbs": "number|null"
  },
  "careRequirements": {
    "requiresVentilator": "boolean",
    "requiresTracheostomy": "boolean",
    "requiresWoundCare": "boolean",
    "wounds": [
      {
        "location": "string",
        "type": "Pressure Ulcer|Surgical|Diabetic|Other",
        "stage": "1|2|3|4|Unstageable|null"
      }
    ],
    "requiresIvTherapy": "boolean",
    "ivMedications": ["string"],
    "requiresDialysis": "boolean",
    "requiresOxygen": "boolean",
    "oxygenLitersPerMinute": "number|null",
    "therapyNeeds": {
      "physicalTherapy": "boolean",
      "occupationalTherapy": "boolean",
      "speechTherapy": "boolean"
    }
  },
  "behavioralStatus": {
    "hasBehavioralIssues": "boolean",
    "behaviors": ["verbal_aggression|physical_aggression|exit_seeking|wandering"],
    "elopementRisk": "None|Low|Moderate|High|null",
    "substanceUseActive": "boolean"
  },
  "insuranceInfo": {
    "primaryPayer": "Medicare A|Medicare Advantage|Medicaid|Managed Care|Commercial|Self Pay|null",
    "payerName": "string|null",
    "memberId": "string|null",
    "snfDaysRemaining": "number|null",
    "medicaidPending": "boolean"
  }
}

Return ONLY valid JSON.`;
```

## 3.5 Success Criteria Phase 3
- [ ] OCR processes uploaded PDFs
- [ ] Documents classified by type
- [ ] Structured data extracted to database
- [ ] Extraction displayed in UI
- [ ] Processing queue handles failures with retry
</phase_3_tasks>

---

# PHASE 4: AI Agents & Decision Engine (Week 8-10)

<phase_4_tasks>
## 4.1 The 5 AI Agents

Build these as separate modules called by an orchestrator:

### Agent 1: ADMISSIONS AGENT
**Purpose:** Evaluate clinical fit against facility criteria

```typescript
interface AdmissionsAgentInput {
  extractedData: ExtractedPatientData;
  facilityCriteria: FacilityCriteria[];
  facilityCapabilities: FacilityCapability[];
}

interface AdmissionsAgentOutput {
  recommendation: 'accept' | 'decline' | 'review';
  fitScore: number; // 0-100
  dealBreakers: RiskFlag[];
  warnings: RiskFlag[];
  criteriaMatches: CriteriaMatch[];
}
```

**Logic:**
1. Load facility's active criteria rules
2. For each criterion, evaluate against patient data
3. If hard_stop criteria match → add to dealBreakers
4. Calculate weighted score from scoring criteria
5. If soft_flag criteria match → add to warnings
6. Generate recommendation based on score thresholds

### Agent 2: REIMBURSEMENT AGENT
**Purpose:** Financial analysis and PDPM scoring

```typescript
interface ReimbursementAgentOutput {
  pdpmComponents: {
    nursing: { category: string; dailyRate: number };
    pt: { category: string; dailyRate: number };
    ot: { category: string; dailyRate: number };
    slp: { category: string; dailyRate: number };
    nta: { category: string; dailyRate: number };
  };
  estimatedDailyRate: number;
  estimatedLosDays: number;
  estimatedTotalRevenue: number;
  financialFlags: RiskFlag[];
}
```

### Agent 3: CLINICAL AGENT
**Purpose:** Deep clinical risk analysis

```typescript
interface ClinicalAgentOutput {
  clinicalComplexityScore: number; // 1-10
  specialCareNeeds: string[];
  comorbidityRisks: RiskFlag[];
  equipmentNeeds: string[];
}
```

### Agent 4: DOCUMENTATION AGENT
**Purpose:** Generate standardized summary

```typescript
interface DocumentationAgentOutput {
  patientSummary: string; // One-page summary
  missingDocuments: string[];
  evidenceCitations: { claim: string; source: string; page?: number }[];
}
```

## 4.2 Orchestrator

```typescript
async function processReferralAI(referralId: string) {
  // 1. Load data
  const referral = await getReferralWithDocuments(referralId);
  const extractedData = await getExtractedData(referralId);
  const facility = await getFacility(referral.facilityId);
  const criteria = await getActiveCriteria(facility.id);
  const capabilities = await getCapabilities(facility.id);
  
  // 2. Run agents in parallel
  const [admissions, reimbursement, clinical] = await Promise.all([
    admissionsAgent.process({ extractedData, criteria, capabilities }),
    reimbursementAgent.process({ extractedData }),
    clinicalAgent.process({ extractedData, capabilities })
  ]);
  
  // 3. Run documentation agent
  const documentation = await documentationAgent.process({ extractedData, referral });
  
  // 4. Aggregate results
  const overallScore = calculateOverallScore(admissions, reimbursement, clinical);
  const recommendation = determineRecommendation(admissions, overallScore);
  
  // 5. Generate rationale
  const rationale = await generateRationale({
    extractedData,
    admissions,
    reimbursement,
    clinical,
    recommendation
  });
  
  // 6. Save everything
  await saveRecommendation(referralId, {
    recommendation,
    overallScore,
    clinicalFitScore: admissions.fitScore,
    financialFitScore: reimbursement.financialScore,
    operationalFitScore: clinical.operationalScore,
    estimatedDailyRate: reimbursement.estimatedDailyRate,
    estimatedLosDays: reimbursement.estimatedLosDays,
    estimatedTotalRevenue: reimbursement.estimatedTotalRevenue,
    pdpmComponents: reimbursement.pdpmComponents,
    summary: rationale.summary,
    detailedRationale: rationale.detailed,
    reviewQuestions: rationale.questions,
    positiveFactors: admissions.positiveFactors,
    missingInfo: documentation.missingDocuments
  });
  
  // 7. Create risk flags
  const allFlags = [
    ...admissions.dealBreakers,
    ...admissions.warnings,
    ...reimbursement.financialFlags,
    ...clinical.comorbidityRisks
  ];
  await createRiskFlags(referralId, allFlags);
  
  // 8. Log AI processing
  await logAIProcessing(referralId, { admissions, reimbursement, clinical, documentation });
  
  // 9. Update referral status
  await updateReferralStatus(referralId, 'ready_for_decision');
}
```

## 4.3 Criteria Matching Engine

Support these operators:
```typescript
type Operator = 
  | 'equals' | 'not_equals'
  | 'greater_than' | 'less_than' | 'between'
  | 'contains' | 'not_contains'
  | 'contains_any' | 'contains_all'
  | 'in_list' | 'not_in_list'
  | 'is_null' | 'is_not_null';

function evaluateCriterion(
  patientData: ExtractedPatientData,
  criterion: FacilityCriteria
): CriteriaMatch {
  const rule = criterion.rule_definition;
  const fieldValue = getNestedField(patientData, rule.field);
  
  let matched = false;
  switch (rule.operator) {
    case 'equals':
      matched = fieldValue === rule.value;
      break;
    case 'greater_than':
      matched = fieldValue > rule.value;
      break;
    case 'less_than':
      matched = fieldValue < rule.value;
      break;
    case 'contains_any':
      matched = rule.values.some(v => fieldValue?.includes(v));
      break;
    // ... other operators
  }
  
  return {
    criteriaId: criterion.id,
    criteriaName: criterion.name,
    matched,
    isDealBreaker: criterion.is_deal_breaker && matched,
    scoreImpact: matched ? (rule.score_impact || 0) : 0,
    reason: matched ? rule.message : null
  };
}
```

## 4.4 Success Criteria Phase 4
- [ ] All 4 agents implemented and tested
- [ ] Orchestrator coordinates agents
- [ ] Criteria matching works with all operators
- [ ] Recommendations generated with rationale
- [ ] Risk flags created and displayed
- [ ] AI processing logged
</phase_4_tasks>

---

# PHASE 5: Decision Workflow & Analytics (Week 11-12)

<phase_5_tasks>
## 5.1 Decision Panel

Create decision UI with:
- Three buttons: Accept, Decline, Request More Info
- Decline reason dropdown (required if declining)
- Notes textarea
- Shows if following or overriding AI
- Confirm modal before submission

## 5.2 Criteria Admin UI

Visual rule builder:
- Add/edit/delete criteria
- Set category (clinical/financial/operational)
- Set rule type (hard_stop/soft_flag/scoring)
- Configure field, operator, value
- Set weight and priority
- Toggle active/inactive

## 5.3 Analytics Dashboard

Build these widgets:
- KPI cards: Referrals this week, Acceptance rate, Avg response time
- Line chart: Referral volume trend
- Pie chart: Payer mix
- Bar chart: Referrals by source
- Table: Top decline reasons
- AI accuracy: Followed vs overridden

## 5.4 Bed Board

Visual grid showing:
- Each room/bed with status color
- Patient name if occupied
- Click for patient details
- Reserve bed for pending referral

## 5.5 Success Criteria Phase 5
- [ ] Decision workflow complete with audit trail
- [ ] Criteria builder working
- [ ] Analytics dashboard shows real data
- [ ] Bed board displays and updates
- [ ] Notifications sent on key events
</phase_5_tasks>

---

# CRITERIA EXAMPLES

<criteria_examples>
Use these as seed data or templates:

```json
[
  {
    "name": "Ventilator Dependent",
    "category": "clinical",
    "rule_type": "hard_stop",
    "is_deal_breaker": true,
    "rule_definition": {
      "field": "careRequirements.requiresVentilator",
      "operator": "equals",
      "value": true,
      "requires_capability": "ventilator",
      "message": "Patient requires ventilator - checking facility capability"
    }
  },
  {
    "name": "Active Substance Abuse",
    "category": "clinical",
    "rule_type": "hard_stop",
    "is_deal_breaker": true,
    "rule_definition": {
      "field": "behavioralStatus.substanceUseActive",
      "operator": "equals",
      "value": true,
      "message": "Active substance abuse - requires specialized treatment facility"
    }
  },
  {
    "name": "Severe Cognitive Impairment",
    "category": "clinical",
    "rule_type": "soft_flag",
    "rule_definition": {
      "field": "functionalStatus.bimsScore",
      "operator": "less_than",
      "value": 8,
      "score_impact": -15,
      "flag_severity": "high",
      "message": "BIMS < 8 indicates moderate-severe cognitive impairment"
    }
  },
  {
    "name": "Stage 3-4 Pressure Ulcer",
    "category": "clinical",
    "rule_type": "soft_flag",
    "rule_definition": {
      "field": "careRequirements.wounds",
      "operator": "contains_any_match",
      "match_field": "stage",
      "values": ["3", "4", "Unstageable"],
      "score_impact": -10,
      "flag_severity": "high",
      "message": "Advanced pressure ulcer - verify wound care capabilities"
    }
  },
  {
    "name": "High Fall Risk",
    "category": "clinical",
    "rule_type": "soft_flag",
    "rule_definition": {
      "field": "functionalStatus.fallRisk",
      "operator": "equals",
      "value": "High",
      "score_impact": -5,
      "flag_severity": "medium",
      "message": "High fall risk - may require additional monitoring"
    }
  },
  {
    "name": "Dialysis Required",
    "category": "operational",
    "rule_type": "soft_flag",
    "rule_definition": {
      "field": "careRequirements.requiresDialysis",
      "operator": "equals",
      "value": true,
      "score_impact": -10,
      "flag_severity": "medium",
      "message": "Dialysis required - verify transportation logistics"
    }
  },
  {
    "name": "Bariatric Over 400lbs",
    "category": "operational",
    "rule_type": "soft_flag",
    "rule_definition": {
      "field": "functionalStatus.weightLbs",
      "operator": "greater_than",
      "value": 400,
      "requires_capability": "bariatric_500lb",
      "score_impact": -10,
      "flag_severity": "medium",
      "message": "Patient > 400lbs - verify bariatric equipment"
    }
  },
  {
    "name": "Medicare A with Good Days",
    "category": "financial",
    "rule_type": "scoring",
    "rule_definition": {
      "field": "insuranceInfo.primaryPayer",
      "operator": "equals",
      "value": "Medicare A",
      "additional_condition": {
        "field": "insuranceInfo.snfDaysRemaining",
        "operator": "greater_than",
        "value": 60
      },
      "score_impact": 20,
      "message": "Medicare A with >60 benefit days - optimal payer"
    }
  },
  {
    "name": "Medicaid Pending",
    "category": "financial",
    "rule_type": "soft_flag",
    "rule_definition": {
      "field": "insuranceInfo.medicaidPending",
      "operator": "equals",
      "value": true,
      "score_impact": -15,
      "flag_severity": "high",
      "message": "Medicaid pending - verify expected approval timeline"
    }
  },
  {
    "name": "High-Cost IV Antibiotics",
    "category": "financial",
    "rule_type": "soft_flag",
    "rule_definition": {
      "field": "careRequirements.ivMedications",
      "operator": "contains_any",
      "values": ["Daptomycin", "Ceftaroline", "Oritavancin", "Dalbavancin"],
      "score_impact": -10,
      "flag_severity": "medium",
      "message": "High-cost IV antibiotic - verify reimbursement coverage"
    }
  },
  {
    "name": "Elopement Risk",
    "category": "clinical",
    "rule_type": "soft_flag",
    "rule_definition": {
      "field": "behavioralStatus.elopementRisk",
      "operator": "in_list",
      "values": ["Moderate", "High"],
      "requires_capability": "secured_unit",
      "score_impact": -15,
      "flag_severity": "high",
      "message": "Elopement risk - may require secured unit"
    }
  }
]
```
</criteria_examples>

---

# API ENDPOINTS REFERENCE

<api_endpoints>
```
# AUTH
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me
POST   /api/auth/refresh

# REFERRALS
GET    /api/referrals                    # List with filters
POST   /api/referrals                    # Create
GET    /api/referrals/:id                # Get detail
PATCH  /api/referrals/:id                # Update
POST   /api/referrals/:id/process        # Trigger AI processing
POST   /api/referrals/:id/assign         # Assign to user
POST   /api/referrals/:id/decision       # Record decision

# DOCUMENTS
POST   /api/referrals/:id/documents      # Upload
GET    /api/referrals/:id/documents      # List
GET    /api/documents/:id/download       # Download file

# AI
GET    /api/referrals/:id/extraction     # Get extracted data
GET    /api/referrals/:id/recommendation # Get AI recommendation
GET    /api/referrals/:id/risk-flags     # Get risk flags
PATCH  /api/referrals/:id/risk-flags/:fid # Resolve flag

# FACILITIES
GET    /api/facilities                   # List
GET    /api/facilities/:id               # Detail
PATCH  /api/facilities/:id               # Update
GET    /api/facilities/:id/criteria      # List criteria
POST   /api/facilities/:id/criteria      # Create criterion
PATCH  /api/facilities/:id/criteria/:cid # Update criterion
GET    /api/facilities/:id/capabilities  # List capabilities
GET    /api/facilities/:id/beds          # Bed board

# ANALYTICS
GET    /api/analytics/dashboard
GET    /api/analytics/referral-funnel
GET    /api/analytics/decline-reasons
GET    /api/analytics/payer-mix
```
</api_endpoints>

---

# UI COMPONENTS

<ui_components>
Build these key components:

1. **ReferralCard** - Queue card with status badge, patient name, AI score
2. **ReferralDetail** - Full page with tabs (Overview, Documents, AI, Activity)
3. **AIRecommendationPanel** - Shows score, recommendation, rationale
4. **RiskFlagList** - Expandable flags with resolve action
5. **CriteriaBuilder** - Visual rule builder
6. **DocumentViewer** - PDF viewer with extracted text toggle
7. **BedBoard** - Grid of beds with status colors
8. **DecisionPanel** - Accept/Decline buttons with reason dropdown
9. **AnalyticsCharts** - Dashboard visualizations (use Recharts)
10. **ActivityTimeline** - Comments, status changes, AI events
</ui_components>

---

# PROJECT STRUCTURE

<project_structure>
```
exacare-clone/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx              # Dashboard
│   │   │   │   ├── referrals/
│   │   │   │   │   ├── page.tsx          # List
│   │   │   │   │   └── [id]/page.tsx     # Detail
│   │   │   │   ├── bed-board/page.tsx
│   │   │   │   ├── analytics/page.tsx
│   │   │   │   └── settings/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── criteria/page.tsx
│   │   │   │       └── users/page.tsx
│   │   ├── components/
│   │   │   ├── ui/                       # shadcn
│   │   │   ├── referrals/
│   │   │   │   ├── referral-card.tsx
│   │   │   │   ├── referral-list.tsx
│   │   │   │   ├── referral-detail.tsx
│   │   │   │   ├── ai-recommendation.tsx
│   │   │   │   ├── risk-flags.tsx
│   │   │   │   └── decision-panel.tsx
│   │   │   ├── analytics/
│   │   │   └── shared/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── utils.ts
│   │   └── hooks/
│   │
│   └── api/                              # Fastify backend
│       ├── src/
│       │   ├── index.ts
│       │   ├── routes/
│       │   │   ├── referrals.ts
│       │   │   ├── facilities.ts
│       │   │   ├── analytics.ts
│       │   │   └── users.ts
│       │   ├── services/
│       │   │   ├── referral.service.ts
│       │   │   ├── document.service.ts
│       │   │   ├── criteria.service.ts
│       │   │   └── analytics.service.ts
│       │   ├── agents/
│       │   │   ├── admissions.agent.ts
│       │   │   ├── reimbursement.agent.ts
│       │   │   ├── clinical.agent.ts
│       │   │   ├── documentation.agent.ts
│       │   │   └── orchestrator.ts
│       │   ├── workers/
│       │   │   ├── ocr.worker.ts
│       │   │   ├── extraction.worker.ts
│       │   │   └── recommendation.worker.ts
│       │   └── lib/
│       │       ├── prisma.ts
│       │       ├── redis.ts
│       │       ├── s3.ts
│       │       ├── textract.ts
│       │       └── anthropic.ts
│       └── prisma/
│           └── schema.prisma
│
├── docker-compose.yml
└── package.json
```
</project_structure>

---

# SUCCESS CRITERIA

<success_criteria>
MVP is complete when:

- [ ] User can upload a PDF referral
- [ ] OCR extracts text from documents
- [ ] AI classifies document types
- [ ] AI extracts structured patient data
- [ ] Criteria matching runs against facility rules
- [ ] AI generates accept/decline recommendation with rationale
- [ ] Risk flags displayed with severity
- [ ] User can record decision with notes
- [ ] Decision audit trail saved
- [ ] Dashboard shows basic analytics
- [ ] Bed board displays facility capacity
</success_criteria>

---

# IMPORTANT NOTES

<important_notes>
1. **HIPAA Compliance**: Encrypt data at rest and in transit. Never log PHI.

2. **Audit Trails**: Log ALL AI decisions with full input/output for compliance.

3. **AI Confidence**: Always show confidence scores. Flag low-confidence for human review.

4. **Error Handling**: AI processing can fail. Implement retries and manual fallback.

5. **Performance**: OCR + AI takes 30-60 seconds. Use background jobs, show progress.

6. **Testing**: Write tests for criteria matching logic. AI outputs are non-deterministic.

7. **Rate Limits**: Anthropic has rate limits. Implement queuing and backoff.

8. **Document Size**: Large PDFs can exceed token limits. Chunk documents intelligently.
</important_notes>
