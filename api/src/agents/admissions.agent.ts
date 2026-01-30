import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

export interface AdmissionsAgentInput {
  extractedData: any;
  facilityId: string;
}

export interface RiskFlag {
  category: string;
  flagType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isDealBreaker: boolean;
  title: string;
  description: string;
  recommendation: string;
}

export interface CriteriaMatch {
  criteriaId: string;
  criteriaName: string;
  matched: boolean;
  isDealBreaker: boolean;
  scoreImpact: number;
  reason: string | null;
}

export interface AdmissionsAgentOutput {
  recommendation: 'accept' | 'decline' | 'review';
  fitScore: number; // 0-100
  dealBreakers: RiskFlag[];
  warnings: RiskFlag[];
  criteriaMatches: CriteriaMatch[];
  positiveFactors: string[];
}

const ADMISSIONS_EVALUATION_PROMPT = `Evaluate this patient for SNF admission based on the provided data and facility criteria.

PATIENT DATA:
---
{patientData}
---

FACILITY CRITERIA:
---
{facilityCriteria}
---

FACILITY CAPABILITIES:
---
{facilityCapabilities}
---

Evaluate the patient against each criterion and provide:
1. Overall fit score (0-100)
2. Recommendation (accept/decline/review)
3. List of any deal-breakers that must be addressed
4. List of warnings that require attention
5. Positive factors that make this patient a good fit
6. Detailed criteria matching results

Return ONLY JSON in this format:
{
  "recommendation": "accept|decline|review",
  "fitScore": 85,
  "dealBreakers": [
    {
      "category": "clinical",
      "flagType": "ventilator_required",
      "severity": "critical",
      "isDealBreaker": true,
      "title": "Ventilator Dependency",
      "description": "Patient requires mechanical ventilation",
      "recommendation": "Facility must have ventilator capability"
    }
  ],
  "warnings": [
    {
      "category": "clinical",
      "flagType": "high_fall_risk",
      "severity": "medium",
      "isDealBreaker": false,
      "title": "High Fall Risk",
      "description": "Patient has history of falls",
      "recommendation": "Implement fall prevention protocol"
    }
  ],
  "positiveFactors": [
    "Medicare A with >60 days remaining",
    "No active behavioral health issues",
    "Family support system in place"
  ],
  "criteriaMatches": [
    {
      "criteriaId": "id",
      "criteriaName": "name",
      "matched": true,
      "isDealBreaker": false,
      "scoreImpact": 10,
      "reason": "Meets requirement"
    }
  ]
}`;

export const admissionsAgent = async (input: AdmissionsAgentInput): Promise<AdmissionsAgentOutput> => {
  try {
    // Get facility criteria and capabilities
    const facilityCriteria = await prisma.facilityCriteria.findMany({
      where: {
        facilityId: input.facilityId,
        isActive: true
      },
      orderBy: {
        priority: 'asc'
      }
    });

    // Get facility details for capabilities (stored in settings JSON)
    const facility = await prisma.facility.findUnique({
      where: { id: input.facilityId }
    });
    const facilityCapabilities = facility?.settings || {};

    // Prepare data for prompt
    const patientData = JSON.stringify(input.extractedData, null, 2);
    const criteriaText = JSON.stringify(facilityCriteria, null, 2);
    const capabilitiesText = JSON.stringify(facilityCapabilities, null, 2);

    const prompt = ADMISSIONS_EVALUATION_PROMPT
      .replace('{patientData}', patientData)
      .replace('{facilityCriteria}', criteriaText)
      .replace('{facilityCapabilities}', capabilitiesText);

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
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
    
    // Ensure all required fields are present
    return {
      recommendation: result.recommendation || 'review',
      fitScore: result.fitScore || 50,
      dealBreakers: result.dealBreakers || [],
      warnings: result.warnings || [],
      criteriaMatches: result.criteriaMatches || [],
      positiveFactors: result.positiveFactors || []
    };

  } catch (error) {
    console.error('Admissions agent error:', error);
    
    // Return conservative default on error
    return {
      recommendation: 'review',
      fitScore: 50,
      dealBreakers: [],
      warnings: [{
        category: 'system',
        flagType: 'ai_processing_error',
        severity: 'medium',
        isDealBreaker: false,
        title: 'AI Processing Error',
        description: 'Could not complete automated evaluation',
        recommendation: 'Manual review required'
      }],
      criteriaMatches: [],
      positiveFactors: []
    };
  }
};

export default {
  admissionsAgent
};
