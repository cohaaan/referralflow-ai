import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

export interface ClinicalRisk {
  category: string;
  flagType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isDealBreaker: boolean;
  title: string;
  description: string;
  recommendation: string;
}

export interface ClinicalAgentOutput {
  clinicalComplexityScore: number; // 1-10
  operationalScore: number; // 0-100
  specialCareNeeds: string[];
  comorbidityRisks: ClinicalRisk[];
  equipmentNeeds: string[];
  staffingConsiderations: string[];
  estimatedNursingHoursPerDay: number;
}

const CLINICAL_ANALYSIS_PROMPT = `Perform a deep clinical risk analysis for this SNF admission candidate.

PATIENT DATA:
---
{patientData}
---

Evaluate:
1. Clinical complexity score (1-10, where 10 is most complex)
2. Special care needs that require dedicated attention
3. Comorbidity risks and potential complications
4. Equipment needs
5. Staffing considerations
6. Estimated nursing hours per day

Consider:
- Multiple chronic conditions and their interactions
- Fall risk factors
- Skin integrity risks
- Medication complexity
- Behavioral health needs
- Infection control requirements
- Rehabilitation potential

Return ONLY JSON:
{
  "clinicalComplexityScore": 7,
  "operationalScore": 72,
  "specialCareNeeds": [
    "Wound care certified nurse for stage 3 sacral wound",
    "Daily INR monitoring for Warfarin therapy",
    "Blood glucose monitoring QID"
  ],
  "comorbidityRisks": [
    {
      "category": "clinical",
      "flagType": "multiple_comorbidities",
      "severity": "high",
      "isDealBreaker": false,
      "title": "Complex Cardiac History",
      "description": "CHF with EF 35%, AFib on anticoagulation, HTN",
      "recommendation": "Close cardiac monitoring, daily weights, telemetry if available"
    }
  ],
  "equipmentNeeds": [
    "Bariatric bed (patient 380 lbs)",
    "Wound VAC supplies",
    "Oxygen concentrator"
  ],
  "staffingConsiderations": [
    "2-person assist for transfers",
    "Wound care nurse 3x weekly",
    "Physical therapy 5x weekly"
  ],
  "estimatedNursingHoursPerDay": 3.5
}`;

export const clinicalAgent = async (extractedData: any): Promise<ClinicalAgentOutput> => {
  try {
    const patientData = JSON.stringify(extractedData, null, 2);
    const prompt = CLINICAL_ANALYSIS_PROMPT.replace('{patientData}', patientData);

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2500,
      temperature: 0.2,
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
      clinicalComplexityScore: result.clinicalComplexityScore || 5,
      operationalScore: result.operationalScore || 50,
      specialCareNeeds: result.specialCareNeeds || [],
      comorbidityRisks: result.comorbidityRisks || [],
      equipmentNeeds: result.equipmentNeeds || [],
      staffingConsiderations: result.staffingConsiderations || [],
      estimatedNursingHoursPerDay: result.estimatedNursingHoursPerDay || 2
    };

  } catch (error) {
    console.error('Clinical agent error:', error);
    
    return {
      clinicalComplexityScore: 5,
      operationalScore: 50,
      specialCareNeeds: [],
      comorbidityRisks: [{
        category: 'system',
        flagType: 'ai_processing_error',
        severity: 'medium',
        isDealBreaker: false,
        title: 'Clinical Analysis Error',
        description: 'Could not complete clinical analysis',
        recommendation: 'Manual clinical review required'
      }],
      equipmentNeeds: [],
      staffingConsiderations: [],
      estimatedNursingHoursPerDay: 2
    };
  }
};

export default {
  clinicalAgent
};
