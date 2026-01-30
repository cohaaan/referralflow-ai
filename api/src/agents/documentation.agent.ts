import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

export interface EvidenceCitation {
  claim: string;
  source: string;
  excerpt?: string;
}

export interface DocumentationAgentOutput {
  patientSummary: string;
  missingDocuments: string[];
  evidenceCitations: EvidenceCitation[];
  documentQuality: {
    completeness: number; // 0-100
    legibility: number; // 0-100
    recency: number; // 0-100
  };
  keyFindings: string[];
}

const DOCUMENTATION_PROMPT = `Generate a comprehensive patient summary and documentation analysis.

PATIENT DATA:
---
{patientData}
---

DOCUMENT TYPES RECEIVED:
---
{documentTypes}
---

Create:
1. A one-page patient summary suitable for clinical handoff
2. List of missing documents that would be helpful for admission decision
3. Evidence citations linking key clinical findings to source documents
4. Assessment of documentation quality

REQUIRED DOCUMENTS FOR SNF ADMISSION:
- Face sheet (demographics)
- History and Physical (H&P)
- Discharge summary
- Medication list/MAR
- Recent labs (within 72 hours)
- Physician orders

Return ONLY JSON:
{
  "patientSummary": "Patient Summary: John Smith, 78-year-old male presenting for SNF admission following hospitalization for CHF exacerbation. Primary diagnosis: Acute on chronic systolic heart failure (I50.22) with reduced EF of 35%. Secondary diagnoses include Type 2 diabetes, hypertension, and chronic kidney disease stage 3. Current medications include Lasix 40mg BID, Lisinopril 10mg daily, Metoprolol 25mg BID. Functional status: Requires 2-person assist for transfers, uses wheelchair for mobility. BIMS score of 12 indicates intact cognition. Patient is full code. Insurance: Medicare A with 85 benefit days remaining. Anticipated LOS: 21 days for cardiac rehabilitation and medication optimization.",
  "missingDocuments": [
    "Recent echocardiogram report",
    "PT/OT evaluation from hospital",
    "Wound care protocol (if applicable)"
  ],
  "evidenceCitations": [
    {
      "claim": "Patient has CHF with EF 35%",
      "source": "Discharge Summary",
      "excerpt": "Echo dated 1/15/24 showed LVEF 35%"
    },
    {
      "claim": "Patient requires 2-person assist",
      "source": "Nursing Notes",
      "excerpt": "Patient unable to bear weight, requires max assist x2"
    }
  ],
  "documentQuality": {
    "completeness": 75,
    "legibility": 90,
    "recency": 85
  },
  "keyFindings": [
    "High fall risk due to CHF and mobility limitations",
    "Anticoagulation requires close INR monitoring",
    "Good rehabilitation potential per PT evaluation"
  ]
}`;

export const documentationAgent = async (
  extractedData: any,
  documentTypes: string[]
): Promise<DocumentationAgentOutput> => {
  try {
    const patientData = JSON.stringify(extractedData, null, 2);
    const docTypes = JSON.stringify(documentTypes, null, 2);
    
    const prompt = DOCUMENTATION_PROMPT
      .replace('{patientData}', patientData)
      .replace('{documentTypes}', docTypes);

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      temperature: 0.3,
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

    const result = JSON.parse(content.text);
    
    return {
      patientSummary: result.patientSummary || 'Summary generation failed',
      missingDocuments: result.missingDocuments || [],
      evidenceCitations: result.evidenceCitations || [],
      documentQuality: result.documentQuality || {
        completeness: 50,
        legibility: 50,
        recency: 50
      },
      keyFindings: result.keyFindings || []
    };

  } catch (error) {
    console.error('Documentation agent error:', error);
    
    return {
      patientSummary: 'Unable to generate patient summary. Manual review required.',
      missingDocuments: ['Unable to determine - analysis failed'],
      evidenceCitations: [],
      documentQuality: {
        completeness: 0,
        legibility: 0,
        recency: 0
      },
      keyFindings: ['Documentation analysis failed - manual review required']
    };
  }
};

export default {
  documentationAgent
};
