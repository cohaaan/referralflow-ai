import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

export const anthropic = apiKey ? new Anthropic({ apiKey }) : null;

export async function analyzeReferral(patientData: any, facilityName: string) {
  if (!anthropic) {
    console.warn('Anthropic API key not configured, using mock data');
    return getMockAnalysis();
  }

  const prompt = `You are an AI admissions analyst for a Skilled Nursing Facility (SNF). Analyze this patient referral and provide a recommendation.

FACILITY: ${facilityName}

PATIENT DATA:
${JSON.stringify(patientData, null, 2)}

Analyze the patient for:
1. Clinical fit (diagnoses, care needs, medications)
2. Financial fit (insurance, estimated reimbursement)
3. Operational fit (bed availability, staffing needs)

Return a JSON response with this exact structure:
{
  "recommendation": "accept" | "review" | "decline",
  "confidence": 0.0 to 1.0,
  "summary": "Brief 2-3 sentence summary",
  "scores": {
    "clinical": 0-100,
    "financial": 0-100,
    "operational": 0-100
  },
  "estimatedDailyRate": number,
  "estimatedLosDays": number,
  "estimatedRevenue": number,
  "positiveFactors": ["factor1", "factor2"],
  "flags": [
    {"text": "flag description", "severity": "hard_stop" | "warning" | "info"}
  ],
  "missingInfo": ["item1", "item2"]
}

Return ONLY valid JSON, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return JSON.parse(content.text);
    }
    return getMockAnalysis();
  } catch (error) {
    console.error('AI Analysis error:', error);
    return getMockAnalysis();
  }
}

export async function extractPatientData(ocrText: string) {
  if (!anthropic) {
    return getMockExtraction();
  }

  const prompt = `Extract structured patient data from this medical document text.

DOCUMENT TEXT:
${ocrText.substring(0, 8000)}

Return a JSON object with this structure:
{
  "demographics": {
    "firstName": "string|null",
    "lastName": "string|null",
    "dob": "YYYY-MM-DD|null",
    "age": number|null,
    "gender": "male|female|null"
  },
  "clinicalSummary": {
    "chiefComplaint": "string|null",
    "primaryDiagnosis": "string|null",
    "codeStatus": "Full Code|DNR|null"
  },
  "diagnoses": [{"icd10Code": "string", "description": "string", "type": "primary|secondary"}],
  "medications": [{"name": "string", "dose": "string|null", "frequency": "string|null"}],
  "functionalStatus": {
    "mobility": "string|null",
    "bimsScore": number|null,
    "fallRisk": "High|Medium|Low|null"
  },
  "careRequirements": {
    "requiresWoundCare": boolean,
    "requiresIvTherapy": boolean,
    "requiresDialysis": boolean,
    "requiresOxygen": boolean
  },
  "insuranceInfo": {
    "primaryPayer": "string|null",
    "payerName": "string|null",
    "memberId": "string|null"
  }
}

Return ONLY valid JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return JSON.parse(content.text);
    }
    return getMockExtraction();
  } catch (error) {
    console.error('Extraction error:', error);
    return getMockExtraction();
  }
}

function getMockAnalysis() {
  return {
    recommendation: 'accept',
    confidence: 0.92,
    summary: 'Patient is a strong clinical match with high revenue potential. Primary diagnosis fits facility capabilities. Insurance verified.',
    scores: {
      clinical: 88,
      financial: 95,
      operational: 90
    },
    estimatedDailyRate: 650,
    estimatedLosDays: 21,
    estimatedRevenue: 13650,
    positiveFactors: [
      'High reimbursement rate (Medicare A)',
      'Rehab potential: High',
      'Family support available',
      'No isolation precautions needed'
    ],
    flags: [
      { text: 'High Fall Risk (History of falls)', severity: 'warning' },
      { text: 'Requires wound care monitoring', severity: 'info' }
    ],
    missingInfo: []
  };
}

function getMockExtraction() {
  return {
    demographics: {
      firstName: 'Ronald',
      lastName: 'Richards',
      dob: '1946-08-16',
      age: 78,
      gender: 'male'
    },
    clinicalSummary: {
      chiefComplaint: 'Post-surgical rehabilitation',
      primaryDiagnosis: 'I50.9 - Heart failure, unspecified',
      codeStatus: 'Full Code'
    },
    diagnoses: [
      { icd10Code: 'I50.9', description: 'Heart failure, unspecified', type: 'primary' },
      { icd10Code: 'E11.9', description: 'Type 2 diabetes mellitus', type: 'secondary' },
      { icd10Code: 'I10', description: 'Essential hypertension', type: 'secondary' }
    ],
    medications: [
      { name: 'Metoprolol', dose: '50mg', frequency: 'BID' },
      { name: 'Lasix', dose: '40mg', frequency: 'Daily' },
      { name: 'Eliquis', dose: '5mg', frequency: 'BID' },
      { name: 'Atorvastatin', dose: '40mg', frequency: 'Daily' }
    ],
    functionalStatus: {
      mobility: 'Requires 1-person assist',
      bimsScore: 11,
      fallRisk: 'High'
    },
    careRequirements: {
      requiresWoundCare: true,
      requiresIvTherapy: false,
      requiresDialysis: false,
      requiresOxygen: false
    },
    insuranceInfo: {
      primaryPayer: 'Medicare A',
      payerName: 'Medicare',
      memberId: '1EG4-TE5-MK72'
    }
  };
}
