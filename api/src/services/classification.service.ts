import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

export type DocumentType = 
  | 'face_sheet'
  | 'h_and_p'
  | 'discharge_summary'
  | 'medication_list'
  | 'labs'
  | 'consult_notes'
  | 'nursing_notes'
  | 'insurance_card'
  | 'other';

export interface ClassificationResult {
  type: DocumentType;
  confidence: number;
  reasoning?: string;
}

const CLASSIFICATION_PROMPT = `Classify this medical document into exactly ONE category:

CATEGORIES:
- H_AND_P: History and Physical examination document
- DISCHARGE_SUMMARY: Hospital discharge summary
- FACE_SHEET: Patient demographics/admission face sheet
- MEDICATION_LIST: List of current medications
- LABS: Laboratory results
- CONSULT_NOTES: Specialist consultation notes
- NURSING_NOTES: Nursing assessment or progress notes
- INSURANCE_CARD: Insurance information card
- OTHER: Does not fit any of the above categories

DOCUMENT TEXT (first 3000 characters):
---
{documentText}
---

Return ONLY a JSON object with this format:
{
  "type": "CATEGORY_NAME",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this category was chosen"
}

The confidence should be a number between 0 and 1 indicating how certain you are of the classification.`;

export const classifyDocument = async (documentText: string): Promise<ClassificationResult> => {
  try {
    const prompt = CLASSIFICATION_PROMPT.replace('{documentText}', documentText.substring(0, 3000));
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
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
    
    // Validate the response
    if (!result.type || !result.confidence) {
      throw new Error('Invalid classification response format');
    }

    // Map to enum values if needed
    const typeMapping: Record<string, DocumentType> = {
      'H_AND_P': 'h_and_p',
      'DISCHARGE_SUMMARY': 'discharge_summary',
      'FACE_SHEET': 'face_sheet',
      'MEDICATION_LIST': 'medication_list',
      'LABS': 'labs',
      'CONSULT_NOTES': 'consult_notes',
      'NURSING_NOTES': 'nursing_notes',
      'INSURANCE_CARD': 'insurance_card',
      'OTHER': 'other'
    };

    return {
      type: typeMapping[result.type] || result.type.toLowerCase(),
      confidence: result.confidence,
      reasoning: result.reasoning
    };

  } catch (error) {
    console.error('Document classification error:', error);
    
    // Fallback to 'other' with low confidence
    return {
      type: 'other',
      confidence: 0.1,
      reasoning: 'Classification failed, defaulting to other'
    };
  }
};

export default {
  classifyDocument
};
