# Testing Guide - Verify AI Pipeline Works

## 🧪 Quick Test Checklist

Use this guide to verify the AI processing pipeline is working correctly.

---

## Prerequisites

1. ✅ Docker running (PostgreSQL + Redis)
2. ✅ API keys configured in `api/.env`:
   - `ANTHROPIC_API_KEY`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
3. ✅ S3 bucket created: `referralflow-documents`
4. ✅ Database schema pushed: `npm run db:push`

---

## Test 1: Health Check

**Verify API is running:**

```bash
curl http://localhost:4000/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-30T..."
}
```

---

## Test 2: Create a Facility

**Create a test facility:**

```bash
curl -X POST http://localhost:4000/api/facilities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sunrise Skilled Nursing",
    "organizationId": "test-org-id",
    "facilityType": "SNF",
    "totalBeds": 120,
    "licensedBeds": 120,
    "medicareCertified": true,
    "medicaidCertified": true,
    "city": "Los Angeles",
    "state": "CA"
  }'
```

**Save the facility ID from the response.**

---

## Test 3: Create a Referral

**Create a test referral:**

```bash
curl -X POST http://localhost:4000/api/referrals \
  -H "Content-Type: application/json" \
  -d '{
    "facilityId": "YOUR_FACILITY_ID_HERE",
    "patientFirstName": "John",
    "patientLastName": "Doe",
    "patientDob": "1950-05-15",
    "referralSource": "Hospital",
    "referringFacilityName": "City General Hospital",
    "caseManagerName": "Jane Smith",
    "priority": "normal"
  }'
```

**Save the referral ID from the response.**

---

## Test 4: Upload a Document

**Upload a PDF document:**

```bash
curl -X POST http://localhost:4000/api/referrals/YOUR_REFERRAL_ID/documents \
  -F "file=@/path/to/your/test.pdf"
```

**What happens next (automatically):**

1. ✅ Document uploaded to S3
2. ✅ OCR queue job created
3. ✅ Worker picks up job
4. ✅ Textract processes document
5. ✅ Text extracted and saved
6. ✅ Classification queue job created
7. ✅ Claude classifies document type
8. ✅ Extraction queue job created
9. ✅ Claude extracts patient data
10. ✅ AI processing queue job created
11. ✅ All 4 agents run in parallel
12. ✅ Recommendation generated
13. ✅ Risk flags created
14. ✅ Referral status → "ready_for_decision"

**Watch the worker logs to see this happen!**

---

## Test 5: Check Processing Status

**Get referral details:**

```bash
curl http://localhost:4000/api/referrals/YOUR_REFERRAL_ID
```

**Check these fields:**
- `aiProcessingStatus` should be "completed"
- `status` should be "ready_for_decision"
- `aiRecommendation` should have a value (e.g., "accept", "decline")
- `aiConfidenceScore` should be between 0 and 1

---

## Test 6: View Extracted Data

**Get extracted patient data:**

```bash
curl http://localhost:4000/api/ai/extraction/YOUR_REFERRAL_ID
```

**Expected Response:**
```json
{
  "id": "...",
  "referralId": "...",
  "clinicalSummary": { ... },
  "diagnoses": [ ... ],
  "medications": [ ... ],
  "functionalStatus": { ... },
  "careRequirements": { ... },
  "insuranceInfo": { ... }
}
```

---

## Test 7: View AI Recommendation

**Get AI recommendation:**

```bash
curl http://localhost:4000/api/ai/recommendation/YOUR_REFERRAL_ID
```

**Expected Response:**
```json
{
  "id": "...",
  "recommendation": "accept",
  "confidenceScore": 0.85,
  "overallScore": 78,
  "clinicalFitScore": 80,
  "financialFitScore": 75,
  "operationalFitScore": 80,
  "estimatedDailyRate": 650.00,
  "estimatedLosDays": 21,
  "summary": "Patient is a good fit...",
  "detailedRationale": "..."
}
```

---

## Test 8: View Risk Flags

**Get risk flags:**

```bash
curl http://localhost:4000/api/ai/risk-flags/YOUR_REFERRAL_ID
```

**Expected Response:**
```json
{
  "flags": [
    {
      "id": "...",
      "category": "clinical",
      "severity": "medium",
      "title": "High Fall Risk",
      "description": "Patient has documented fall risk...",
      "isResolved": false
    }
  ]
}
```

---

## Test 9: Make a Decision

**Record a decision:**

```bash
curl -X POST http://localhost:4000/api/referrals/YOUR_REFERRAL_ID/decision \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "accepted",
    "notes": "Patient is a good fit for our facility",
    "followedAiRecommendation": true
  }'
```

---

## Test 10: View Analytics

**Get dashboard stats:**

```bash
curl http://localhost:4000/api/analytics/dashboard
```

**Expected Response:**
```json
{
  "totalReferrals": 1,
  "weekReferrals": 1,
  "monthReferrals": 1,
  "pendingReferrals": 0,
  "acceptedThisMonth": 1,
  "declinedThisMonth": 0,
  "acceptanceRate": 100
}
```

---

## 🐛 Troubleshooting

### Workers not processing documents

**Check:**
1. Redis is running: `docker ps` (should see redis container)
2. Workers are running: `npm run workers:dev` in separate terminal
3. Check worker logs for errors

**Common Issues:**
- Redis not running → Start with `docker-compose up -d`
- API keys missing → Check `api/.env`
- S3 bucket doesn't exist → Create in AWS Console
- AWS permissions → User needs S3 + Textract access

### OCR failing

**Check:**
- AWS credentials are correct
- AWS region matches S3 bucket region
- Textract is available in your region (us-east-1 recommended)
- PDF is not corrupted or password-protected

### Classification/Extraction failing

**Check:**
- Anthropic API key is valid
- You have credits in your Anthropic account
- Check worker logs for specific error messages

### No AI recommendation generated

**Check:**
- All previous steps completed (OCR → Classification → Extraction)
- Check `ai_processing_logs` table for errors:
  ```sql
  SELECT * FROM "AIProcessingLog" WHERE "referralId" = 'YOUR_ID' ORDER BY "createdAt" DESC;
  ```

---

## 📊 Database Queries for Debugging

**Check referral status:**
```sql
SELECT id, status, "aiProcessingStatus", "aiRecommendation" 
FROM "Referral" 
WHERE id = 'YOUR_REFERRAL_ID';
```

**Check documents:**
```sql
SELECT id, "originalFilename", "documentType", "ocrStatus" 
FROM "Document" 
WHERE "referralId" = 'YOUR_REFERRAL_ID';
```

**Check AI processing logs:**
```sql
SELECT "agentName", action, success, "errorMessage", "createdAt"
FROM "AIProcessingLog" 
WHERE "referralId" = 'YOUR_REFERRAL_ID'
ORDER BY "createdAt" DESC;
```

**Check risk flags:**
```sql
SELECT category, severity, title, "isResolved"
FROM "RiskFlag"
WHERE "referralId" = 'YOUR_REFERRAL_ID';
```

---

## ✅ Success Criteria

After running all tests, you should have:

- [x] Facility created
- [x] Referral created
- [x] Document uploaded to S3
- [x] OCR completed (text extracted)
- [x] Document classified
- [x] Patient data extracted
- [x] AI recommendation generated
- [x] Risk flags created
- [x] Decision recorded
- [x] Analytics updated

**If all checkboxes are checked, your AI pipeline is working! 🎉**

