import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, FullAnalysisResult } from "../types";

let ai: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini API key is not configured for the browser build. GitHub Pages cannot access your local .env; route AI calls through the backend API or configure a build-time key."
    );
  }

  if (!ai) {
    ai = new GoogleGenAI({ apiKey });
  }

  return ai;
};

export const analyzePacket = async (
  fileBase64: string,
  mimeType: string,
  keywords: string[],
  fileName: string
): Promise<AnalysisResult> => {
  try {
    const aiClient = getAiClient();
    const keywordString = keywords.join(", ");
    
    const prompt = `
      You are an expert medical referral analyst. 
      Analyze the attached document (Referral Packet).
      
      Your task is to scan the document specifically for the following keywords or phrases: ${keywordString}.
      
      For each occurrence found, identify:
      1. The page number (approximate if not explicit).
      2. The specific keyword found.
      3. A short context snippet of text surrounding the keyword (quote the text).
      4. A confidence level (High/Medium/Low).

      Also provide a brief 2-sentence summary of what this referral packet is about (patient condition, referring facility, etc.).

      Return the data in valid JSON format.
    `;

    const response = await aiClient.models.generateContent({
      model: "gemini-3-flash-preview", // Good for long context documents
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                matches: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            pageNumber: { type: Type.INTEGER },
                            keyword: { type: Type.STRING },
                            contextSnippet: { type: Type.STRING },
                            confidence: { type: Type.STRING },
                        }
                    }
                },
                summary: { type: Type.STRING }
            }
        }
      },
    });

    const jsonText = response.text || "{}";
    const parsed = JSON.parse(jsonText);

    return {
      fileName,
      totalMatches: parsed.matches?.length || 0,
      matches: parsed.matches || [],
      summary: parsed.summary || "No summary available.",
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze the packet. Please try again.");
  }
};

export const analyzeReferralComprehensive = async (
  fileBase64: string,
  mimeType: string,
  fileName: string
): Promise<FullAnalysisResult> => {
  try {
    const aiClient = getAiClient();
    
    const prompt = `
      You are an expert SNF (Skilled Nursing Facility) admissions analyst. 
      Analyze this medical referral document comprehensively.
      
      Extract and analyze:
      1. Patient demographics and primary diagnosis
      2. Insurance/payer information
      3. Clinical complexity and care needs
      4. Fall risk and cognitive status
      5. Medication complexity
      6. Financial projections (PDPM scoring)
      7. Operational requirements
      8. Risk factors and deal-breakers
      9. Overall recommendation (accept/decline/review)
      10. Confidence level and rationale
      
      Consider standard SNF admission criteria:
      - Medicare A coverage preferred
      - Medical necessity for skilled care
      - Rehab potential
      - Facility capability match
      - No exclusionary criteria (ventilator, trach, etc.)
      
      Return detailed analysis in valid JSON format.
    `;

    const response = await aiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            patientSummary: {
              type: Type.OBJECT,
              properties: {
                primaryDiagnosis: { type: Type.STRING },
                age: { type: Type.INTEGER },
                gender: { type: Type.STRING },
                payerType: { type: Type.STRING }
              }
            },
            aiRecommendation: {
              type: Type.OBJECT,
              properties: {
                recommendation: { type: Type.STRING, enum: ["accept", "decline", "review"] },
                confidence: { type: Type.NUMBER },
                summary: { type: Type.STRING },
                scores: {
                  type: Type.OBJECT,
                  properties: {
                    clinical: { type: Type.NUMBER },
                    financial: { type: Type.NUMBER },
                    operational: { type: Type.NUMBER }
                  }
                },
                estimatedRevenue: { type: Type.NUMBER },
                flags: { 
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING },
                      severity: { type: Type.STRING, enum: ["hard_stop", "warning", "info"] }
                    }
                  }
                },
                positiveFactors: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              }
            },
            clinicalData: {
              type: Type.OBJECT,
              properties: {
                primaryDiagnosis: { type: Type.STRING },
                bimsScore: { type: Type.NUMBER },
                mobilityStatus: { type: Type.STRING },
                fallRisk: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                medications: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              }
            },
            riskFactors: { 
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, enum: ["clinical", "financial", "operational"] },
                  severity: { type: Type.STRING, enum: ["critical", "high", "medium", "low"] },
                  description: { type: Type.STRING },
                  recommendation: { type: Type.STRING }
                }
              }
            },
            financialProjection: {
              type: Type.OBJECT,
              properties: {
                estimatedDailyRate: { type: Type.NUMBER },
                estimatedLengthOfStay: { type: Type.NUMBER },
                totalRevenue: { type: Type.NUMBER },
                pdpmScore: { type: Type.NUMBER }
              }
            },
            operationalRequirements: {
              type: Type.OBJECT,
              properties: {
                nursingHoursPerDay: { type: Type.NUMBER },
                specialCareNeeds: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                equipmentRequired: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              }
            }
          }
        }
      },
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Comprehensive Analysis Error:", error);
    throw new Error("Failed to analyze referral comprehensively. Please try again.");
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the "data:*/*;base64," prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = error => reject(error);
  });
};