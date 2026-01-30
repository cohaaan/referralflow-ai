import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

export interface PDPMComponents {
  nursing: { category: string; dailyRate: number };
  pt: { category: string; dailyRate: number };
  ot: { category: string; dailyRate: number };
  slp: { category: string; dailyRate: number };
  nta: { category: string; dailyRate: number };
}

export interface FinancialFlag {
  category: string;
  flagType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isDealBreaker: boolean;
  title: string;
  description: string;
  recommendation: string;
}

export interface ReimbursementAgentOutput {
  pdpmComponents: PDPMComponents;
  estimatedDailyRate: number;
  estimatedLosDays: number;
  estimatedTotalRevenue: number;
  financialScore: number; // 0-100
  financialFlags: FinancialFlag[];
  payerAnalysis: {
    payerType: string;
    riskLevel: string;
    notes: string;
  };
}

const REIMBURSEMENT_PROMPT = `Analyze this patient's financial profile for SNF admission and estimate PDPM reimbursement.

PATIENT DATA:
---
{patientData}
---

Calculate:
1. PDPM component scores and daily rates based on:
   - Nursing: Based on diagnoses, wound care needs, IV therapy, etc.
   - PT: Based on mobility, therapy needs
   - OT: Based on ADL needs, cognitive status
   - SLP: Based on swallowing issues, cognitive status
   - NTA: Non-Therapy Ancillaries based on special treatments

2. Estimated length of stay based on diagnosis and care needs
3. Total estimated revenue
4. Financial risk factors (payer issues, high-cost medications, etc.)

Use 2024 PDPM rates as reference:
- Nursing: $100-$450/day depending on case mix
- PT: $20-$120/day
- OT: $20-$100/day  
- SLP: $0-$80/day
- NTA: $10-$250/day

Return ONLY JSON:
{
  "pdpmComponents": {
    "nursing": { "category": "ES3", "dailyRate": 280 },
    "pt": { "category": "TA", "dailyRate": 85 },
    "ot": { "category": "OA", "dailyRate": 65 },
    "slp": { "category": "SA", "dailyRate": 35 },
    "nta": { "category": "NC1", "dailyRate": 75 }
  },
  "estimatedDailyRate": 540,
  "estimatedLosDays": 21,
  "estimatedTotalRevenue": 11340,
  "financialScore": 75,
  "financialFlags": [
    {
      "category": "financial",
      "flagType": "high_cost_medication",
      "severity": "medium",
      "isDealBreaker": false,
      "title": "High-Cost IV Medication",
      "description": "Patient requires Daptomycin IV",
      "recommendation": "Verify medication is covered under reimbursement"
    }
  ],
  "payerAnalysis": {
    "payerType": "Medicare A",
    "riskLevel": "low",
    "notes": "Medicare A with 85 days remaining - optimal payer"
  }
}`;

export const reimbursementAgent = async (extractedData: any): Promise<ReimbursementAgentOutput> => {
  try {
    const patientData = JSON.stringify(extractedData, null, 2);
    const prompt = REIMBURSEMENT_PROMPT.replace('{patientData}', patientData);

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
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
      pdpmComponents: result.pdpmComponents || {
        nursing: { category: 'Unknown', dailyRate: 200 },
        pt: { category: 'Unknown', dailyRate: 50 },
        ot: { category: 'Unknown', dailyRate: 40 },
        slp: { category: 'Unknown', dailyRate: 20 },
        nta: { category: 'Unknown', dailyRate: 50 }
      },
      estimatedDailyRate: result.estimatedDailyRate || 360,
      estimatedLosDays: result.estimatedLosDays || 20,
      estimatedTotalRevenue: result.estimatedTotalRevenue || 7200,
      financialScore: result.financialScore || 50,
      financialFlags: result.financialFlags || [],
      payerAnalysis: result.payerAnalysis || {
        payerType: 'Unknown',
        riskLevel: 'medium',
        notes: 'Unable to determine payer information'
      }
    };

  } catch (error) {
    console.error('Reimbursement agent error:', error);
    
    return {
      pdpmComponents: {
        nursing: { category: 'Unknown', dailyRate: 200 },
        pt: { category: 'Unknown', dailyRate: 50 },
        ot: { category: 'Unknown', dailyRate: 40 },
        slp: { category: 'Unknown', dailyRate: 20 },
        nta: { category: 'Unknown', dailyRate: 50 }
      },
      estimatedDailyRate: 360,
      estimatedLosDays: 20,
      estimatedTotalRevenue: 7200,
      financialScore: 50,
      financialFlags: [{
        category: 'system',
        flagType: 'ai_processing_error',
        severity: 'medium',
        isDealBreaker: false,
        title: 'Financial Analysis Error',
        description: 'Could not complete financial analysis',
        recommendation: 'Manual financial review required'
      }],
      payerAnalysis: {
        payerType: 'Unknown',
        riskLevel: 'medium',
        notes: 'Analysis failed - manual review required'
      }
    };
  }
};

export default {
  reimbursementAgent
};
