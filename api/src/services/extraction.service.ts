import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

export interface ExtractedPatientData {
  demographics: {
    firstName: string | null;
    lastName: string | null;
    dob: string | null;
    age: number | null;
    gender: 'male' | 'female' | 'other' | null;
    primaryLanguage: string | null;
    interpreterNeeded: boolean;
  };
  clinicalSummary: {
    chiefComplaint: string | null;
    hospitalCourseSummary: string | null;
    codeStatus: 'Full Code' | 'DNR' | 'DNR/DNI' | 'Comfort Care' | null;
    isolationPrecautions: 'None' | 'Contact' | 'Droplet' | 'Airborne' | null;
  };
  diagnoses: Array<{
    icd10Code: string;
    description: string;
    type: 'primary' | 'secondary';
    onset: 'acute' | 'chronic' | null;
  }>;
  medications: Array<{
    name: string;
    dose: string | null;
    route: 'PO' | 'IV' | 'IM' | 'SQ' | 'Topical' | 'Inhaled' | 'Other';
    frequency: string | null;
    isHighCost: boolean;
    requiresMonitoring: boolean;
  }>;
  functionalStatus: {
    mobility: 'Independent' | 'Supervision' | '1 Person Assist' | '2 Person Assist' | 'Non-ambulatory' | null;
    bimsScore: number | null;
    fallRisk: 'Low' | 'Moderate' | 'High' | null;
    weightLbs: number | null;
  };
  careRequirements: {
    requiresVentilator: boolean;
    requiresTracheostomy: boolean;
    requiresWoundCare: boolean;
    wounds: Array<{
      location: string;
      type: 'Pressure Ulcer' | 'Surgical' | 'Diabetic' | 'Other';
      stage: '1' | '2' | '3' | '4' | 'Unstageable' | null;
    }>;
    requiresIvTherapy: boolean;
    ivMedications: string[];
    requiresDialysis: boolean;
    requiresOxygen: boolean;
    oxygenLitersPerMinute: number | null;
    therapyNeeds: {
      physicalTherapy: boolean;
      occupationalTherapy: boolean;
      speechTherapy: boolean;
    };
  };
  behavioralStatus: {
    hasBehavioralIssues: boolean;
    behaviors: string[];
    elopementRisk: 'None' | 'Low' | 'Moderate' | 'High' | null;
    substanceUseActive: boolean;
  };
  insuranceInfo: {
    primaryPayer: 'Medicare A' | 'Medicare Advantage' | 'Medicaid' | 'Managed Care' | 'Commercial' | 'Self Pay' | null;
    payerName: string | null;
    memberId: string | null;
    snfDaysRemaining: number | null;
    medicaidPending: boolean;
  };
}

const EXTRACTION_PROMPT = `Extract structured patient data from these medical documents.

GUIDELINES:
- Extract ICD-10 codes exactly as written (e.g., "I50.9")
- BIMS score is 0-15 scale
- Flag high-cost medications (biologics, specialty meds, IV antibiotics >$500/month)
- If information not found, use null - do not guess
- Dates in ISO format YYYY-MM-DD
- Be precise with medications, doses, and routes

DOCUMENTS:
---
{documents}
---

Return ONLY valid JSON with this exact structure:

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
}`;

const HIGH_COST_MEDICATIONS = [
  'Daptomycin', 'Ceftaroline', 'Oritavancin', 'Dalbavancin',
  'Epoetin alfa', 'Darbepoetin alfa', 'Filgrastim', 'Pegfilgrastim',
  'Rituximab', 'Infliximab', 'Adalimumab', 'Etanercept',
  'Insulin', 'Lantus', 'Humalog', 'Novolog'
];

export const extractPatientData = async (documents: Array<{ type: string; text: string }>): Promise<ExtractedPatientData> => {
  try {
    // Prepare documents text with labels
    const documentsText = documents.map((doc, index) => 
      `DOCUMENT ${index + 1} (${doc.type}):\n${doc.text.substring(0, 4000)}`
    ).join('\n\n---\n\n');

    const prompt = EXTRACTION_PROMPT.replace('{documents}', documentsText);
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response
    const result = JSON.parse(content.text);
    
    // Post-process medications to flag high-cost ones
    if (result.medications) {
      result.medications = result.medications.map((med: any) => ({
        ...med,
        isHighCost: HIGH_COST_MEDICATIONS.some(highCost => 
          med.name.toLowerCase().includes(highCost.toLowerCase())
        ) || med.isHighCost
      }));
    }

    return result;

  } catch (error) {
    console.error('Data extraction error:', error);
    
    // Return empty structure on failure
    return {
      demographics: {
        firstName: null,
        lastName: null,
        dob: null,
        age: null,
        gender: null,
        primaryLanguage: null,
        interpreterNeeded: false
      },
      clinicalSummary: {
        chiefComplaint: null,
        hospitalCourseSummary: null,
        codeStatus: null,
        isolationPrecautions: null
      },
      diagnoses: [],
      medications: [],
      functionalStatus: {
        mobility: null,
        bimsScore: null,
        fallRisk: null,
        weightLbs: null
      },
      careRequirements: {
        requiresVentilator: false,
        requiresTracheostomy: false,
        requiresWoundCare: false,
        wounds: [],
        requiresIvTherapy: false,
        ivMedications: [],
        requiresDialysis: false,
        requiresOxygen: false,
        oxygenLitersPerMinute: null,
        therapyNeeds: {
          physicalTherapy: false,
          occupationalTherapy: false,
          speechTherapy: false
        }
      },
      behavioralStatus: {
        hasBehavioralIssues: false,
        behaviors: [],
        elopementRisk: null,
        substanceUseActive: false
      },
      insuranceInfo: {
        primaryPayer: null,
        payerName: null,
        memberId: null,
        snfDaysRemaining: null,
        medicaidPending: false
      }
    };
  }
};

export default {
  extractPatientData
};
