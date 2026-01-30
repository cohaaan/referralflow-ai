import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

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