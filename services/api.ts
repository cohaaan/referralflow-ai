const API_BASE = 'http://localhost:4000/api';

export interface Referral {
  id: string;
  facilityId: string;
  status: string;
  patientFirstName: string;
  patientLastName: string;
  patientDob: string;
  referralSource: string;
  referringFacilityName: string;
  caseManagerName: string;
  priority: string;
  isUrgent: boolean;
  aiProcessingStatus: string;
  aiRecommendation: string | null;
  aiConfidenceScore: number | null;
  receivedAt: string;
  patient?: Patient;
  aiRecommendationData?: AIRecommendationData;
  riskFlags?: RiskFlag[];
  documents?: Document[];
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  gender: string;
}

export interface AIRecommendationData {
  id: string;
  recommendation: string;
  confidenceScore: number;
  overallScore: number;
  clinicalFitScore: number;
  financialFitScore: number;
  operationalFitScore: number;
  estimatedDailyRate: number;
  estimatedLosDays: number;
  estimatedTotalRevenue: number;
  positiveFactors: string[];
  missingInfo: string[];
  summary: string;
}

export interface RiskFlag {
  id: string;
  category: string;
  flagType: string;
  severity: string;
  title: string;
  description: string;
  isResolved: boolean;
}

export interface Document {
  id: string;
  originalFilename: string;
  documentType: string;
  ocrStatus: string;
}

export interface Bed {
  id: string;
  unitName: string;
  roomNumber: string;
  bedIdentifier: string;
  status: string;
  currentPatientId: string | null;
}

export interface DashboardStats {
  totalReferrals: number;
  weekReferrals: number;
  monthReferrals: number;
  pendingReferrals: number;
  acceptedThisMonth: number;
  declinedThisMonth: number;
  acceptanceRate: number;
  avgResponseTimeHours: number;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Referrals
export const referralApi = {
  list: (params?: { status?: string; facilityId?: string; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchApi<{ referrals: Referral[]; total: number }>(`/referrals?${query}`);
  },

  get: (id: string) => fetchApi<Referral>(`/referrals/${id}`),

  create: (data: Partial<Referral>) =>
    fetchApi<Referral>('/referrals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Referral>) =>
    fetchApi<Referral>(`/referrals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  decision: (id: string, data: { decision: string; reason?: string; notes?: string }) =>
    fetchApi<Referral>(`/referrals/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  process: (id: string) =>
    fetchApi<{ success: boolean; analysis: any }>(`/referrals/${id}/process`, {
      method: 'POST',
    }),

  timeline: (id: string) => fetchApi<any[]>(`/referrals/${id}/timeline`),

  addComment: (id: string, text: string) =>
    fetchApi<any>(`/referrals/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
};

// Facilities
export const facilityApi = {
  list: () => fetchApi<any[]>('/facilities'),
  get: (id: string) => fetchApi<any>(`/facilities/${id}`),
  getCriteria: (id: string) => fetchApi<any[]>(`/facilities/${id}/criteria`),
  createCriterion: (facilityId: string, data: any) =>
    fetchApi<any>(`/facilities/${facilityId}/criteria`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCriterion: (facilityId: string, criteriaId: string, data: any) =>
    fetchApi<any>(`/facilities/${facilityId}/criteria/${criteriaId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// Beds
export const bedApi = {
  list: (facilityId: string) => fetchApi<{ beds: Bed[]; stats: any }>(`/beds/facility/${facilityId}`),
  update: (id: string, data: Partial<Bed>) =>
    fetchApi<Bed>(`/beds/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  reserve: (id: string, referralId: string) =>
    fetchApi<Bed>(`/beds/${id}/reserve`, {
      method: 'POST',
      body: JSON.stringify({ referralId }),
    }),
  census: (facilityId: string) => fetchApi<any>(`/beds/census/${facilityId}`),
};

// Analytics
export const analyticsApi = {
  dashboard: (facilityId?: string) => {
    const query = facilityId ? `?facilityId=${facilityId}` : '';
    return fetchApi<DashboardStats>(`/analytics/dashboard${query}`);
  },
  funnel: (facilityId?: string) => {
    const query = facilityId ? `?facilityId=${facilityId}` : '';
    return fetchApi<any[]>(`/analytics/referral-funnel${query}`);
  },
  declineReasons: (facilityId?: string) => {
    const query = facilityId ? `?facilityId=${facilityId}` : '';
    return fetchApi<any[]>(`/analytics/decline-reasons${query}`);
  },
  payerMix: (facilityId?: string) => {
    const query = facilityId ? `?facilityId=${facilityId}` : '';
    return fetchApi<any[]>(`/analytics/payer-mix${query}`);
  },
  aiAccuracy: (facilityId?: string) => {
    const query = facilityId ? `?facilityId=${facilityId}` : '';
    return fetchApi<any>(`/analytics/ai-accuracy${query}`);
  },
  volumeTrend: (facilityId?: string, days?: number) => {
    const params = new URLSearchParams();
    if (facilityId) params.set('facilityId', facilityId);
    if (days) params.set('days', String(days));
    return fetchApi<any[]>(`/analytics/volume-trend?${params}`);
  },
};

// AI
export const aiApi = {
  getExtraction: (referralId: string) => fetchApi<any>(`/ai/extraction/${referralId}`),
  getRecommendation: (referralId: string) => fetchApi<any>(`/ai/recommendation/${referralId}`),
  getFlags: (referralId: string, resolved?: boolean) => {
    const query = resolved !== undefined ? `?resolved=${resolved}` : '';
    return fetchApi<RiskFlag[]>(`/ai/flags/${referralId}${query}`);
  },
  resolveFlag: (flagId: string, notes?: string) =>
    fetchApi<RiskFlag>(`/ai/flags/${flagId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),
  extract: (text: string, referralId?: string) =>
    fetchApi<any>('/ai/extract', {
      method: 'POST',
      body: JSON.stringify({ text, referralId }),
    }),
};

// Health check
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE.replace('/api', '')}/health`);
    return response.ok;
  } catch {
    return false;
  }
};
