export type Operator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'contains'
  | 'not_contains'
  | 'contains_any'
  | 'contains_all'
  | 'in_list'
  | 'not_in_list'
  | 'is_null'
  | 'is_not_null';

export interface RuleDefinition {
  field: string;
  operator: Operator;
  value?: any;
  values?: any[];
  min?: number;
  max?: number;
  score_impact?: number;
  message?: string;
  requires_capability?: string;
  flag_severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface FacilityCriteria {
  id: string;
  name: string;
  category: string;
  ruleType: string;
  ruleDefinition: RuleDefinition;
  isDealBreaker: boolean;
  weight: number;
  priority: number;
}

export interface CriteriaMatch {
  criteriaId: string;
  criteriaName: string;
  matched: boolean;
  isDealBreaker: boolean;
  scoreImpact: number;
  reason: string | null;
}

function getNestedField(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

export function evaluateCriterion(
  patientData: any,
  criterion: FacilityCriteria
): CriteriaMatch {
  const rule = criterion.ruleDefinition;
  const fieldValue = getNestedField(patientData, rule.field);
  
  let matched = false;
  
  try {
    switch (rule.operator) {
      case 'equals':
        matched = fieldValue === rule.value;
        break;
        
      case 'not_equals':
        matched = fieldValue !== rule.value;
        break;
        
      case 'greater_than':
        matched = typeof fieldValue === 'number' && fieldValue > rule.value;
        break;
        
      case 'less_than':
        matched = typeof fieldValue === 'number' && fieldValue < rule.value;
        break;
        
      case 'between':
        matched = typeof fieldValue === 'number' && 
                  fieldValue >= (rule.min ?? -Infinity) && 
                  fieldValue <= (rule.max ?? Infinity);
        break;
        
      case 'contains':
        if (typeof fieldValue === 'string') {
          matched = fieldValue.toLowerCase().includes(String(rule.value).toLowerCase());
        } else if (Array.isArray(fieldValue)) {
          matched = fieldValue.includes(rule.value);
        }
        break;
        
      case 'not_contains':
        if (typeof fieldValue === 'string') {
          matched = !fieldValue.toLowerCase().includes(String(rule.value).toLowerCase());
        } else if (Array.isArray(fieldValue)) {
          matched = !fieldValue.includes(rule.value);
        }
        break;
        
      case 'contains_any':
        if (Array.isArray(fieldValue) && Array.isArray(rule.values)) {
          matched = rule.values.some(v => fieldValue.includes(v));
        } else if (typeof fieldValue === 'string' && Array.isArray(rule.values)) {
          matched = rule.values.some(v => 
            fieldValue.toLowerCase().includes(String(v).toLowerCase())
          );
        }
        break;
        
      case 'contains_all':
        if (Array.isArray(fieldValue) && Array.isArray(rule.values)) {
          matched = rule.values.every(v => fieldValue.includes(v));
        }
        break;
        
      case 'in_list':
        if (Array.isArray(rule.values)) {
          matched = rule.values.includes(fieldValue);
        }
        break;
        
      case 'not_in_list':
        if (Array.isArray(rule.values)) {
          matched = !rule.values.includes(fieldValue);
        }
        break;
        
      case 'is_null':
        matched = fieldValue === null || fieldValue === undefined;
        break;
        
      case 'is_not_null':
        matched = fieldValue !== null && fieldValue !== undefined;
        break;
        
      default:
        console.warn(`Unknown operator: ${rule.operator}`);
        matched = false;
    }
  } catch (error) {
    console.error(`Error evaluating criterion ${criterion.name}:`, error);
    matched = false;
  }
  
  return {
    criteriaId: criterion.id,
    criteriaName: criterion.name,
    matched,
    isDealBreaker: criterion.isDealBreaker && matched,
    scoreImpact: matched ? (rule.score_impact || 0) : 0,
    reason: matched ? (rule.message || `Criterion "${criterion.name}" matched`) : null
  };
}

export function evaluateAllCriteria(
  patientData: any,
  criteria: FacilityCriteria[]
): {
  matches: CriteriaMatch[];
  totalScore: number;
  hasDealBreakers: boolean;
  dealBreakers: CriteriaMatch[];
  warnings: CriteriaMatch[];
} {
  const matches: CriteriaMatch[] = [];
  let totalScore = 100; // Start with perfect score
  const dealBreakers: CriteriaMatch[] = [];
  const warnings: CriteriaMatch[] = [];
  
  // Sort criteria by priority
  const sortedCriteria = [...criteria].sort((a, b) => a.priority - b.priority);
  
  for (const criterion of sortedCriteria) {
    const match = evaluateCriterion(patientData, criterion);
    matches.push(match);
    
    if (match.matched) {
      totalScore += match.scoreImpact;
      
      if (match.isDealBreaker) {
        dealBreakers.push(match);
      } else if (match.scoreImpact < 0) {
        warnings.push(match);
      }
    }
  }
  
  // Clamp score between 0 and 100
  totalScore = Math.max(0, Math.min(100, totalScore));
  
  return {
    matches,
    totalScore,
    hasDealBreakers: dealBreakers.length > 0,
    dealBreakers,
    warnings
  };
}

export default {
  evaluateCriterion,
  evaluateAllCriteria
};
