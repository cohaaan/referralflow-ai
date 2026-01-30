export interface KeywordMatch {
  pageNumber: number;
  keyword: string;
  contextSnippet: string;
  confidence: string;
}

export interface AnalysisResult {
  fileName: string;
  totalMatches: number;
  matches: KeywordMatch[];
  summary: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  REFERRAL_DETAIL = 'REFERRAL_DETAIL',
  SETTINGS = 'SETTINGS',
}

export interface ReferralData {
  id: string;
  facility: string;
  patientName: string;
  conversionRate: number;
  total: number;
  unopened: number;
  pending: number;
  lost: number;
  denied: number;
  admitted: number;
  aiScore?: number; // Added from architecture
  status?: string;
}

// New types based on Architecture
export interface AIRecommendation {
  recommendation: 'accept' | 'review' | 'decline';
  confidence: number;
  summary: string;
  scores: {
    clinical: number;
    financial: number;
    operational: number;
  };
  estimatedRevenue: number;
  flags: Array<{ text: string; severity: 'hard_stop' | 'warning' | 'info' }>;
  positiveFactors: string[];
}

export interface ClinicalData {
  primaryDiagnosis: string;
  bimsScore: number;
  mobilityStatus: string;
  fallRisk: 'High' | 'Medium' | 'Low';
  medications: string[];
}

export interface FullAnalysisResult {
  patientSummary: {
    primaryDiagnosis: string;
    age: number;
    gender: string;
    payerType: string;
  };
  aiRecommendation: AIRecommendation;
  clinicalData: ClinicalData;
  riskFactors: Array<{
    category: 'clinical' | 'financial' | 'operational';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
  }>;
  financialProjection: {
    estimatedDailyRate: number;
    estimatedLengthOfStay: number;
    totalRevenue: number;
    pdpmScore: number;
  };
  operationalRequirements: {
    nursingHoursPerDay: number;
    specialCareNeeds: string[];
    equipmentRequired: string[];
  };
}
