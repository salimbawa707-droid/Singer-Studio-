/**
 * SURGE STUDIO / MUSICBASE — PHASE 9
 * AI ORCHESTRATION, INTELLIGENCE & PRODUCTION AI GATEWAY TYPES
 */

export type AIProviderId = 
  | 'gemini' 
  | 'groq' 
  | 'openai' 
  | 'local_deterministic' 
  | 'local_model';

export type AICapability = 
  | 'structured_output' 
  | 'text_generation' 
  | 'audio_analysis' 
  | 'composition' 
  | 'arrangement' 
  | 'mixing_recommendations' 
  | 'mastering_recommendations';

export type AIRequestLifecycleState = 
  | 'REQUESTED' 
  | 'VALIDATING' 
  | 'ROUTING' 
  | 'RUNNING' 
  | 'VALIDATING_RESULT' 
  | 'READY_TO_APPLY' 
  | 'APPLIED' 
  | 'FAILED' 
  | 'CANCELLED';

export type AIFailureCategory = 
  | 'AUTH_ERROR' 
  | 'RATE_LIMIT' 
  | 'QUOTA_EXCEEDED' 
  | 'NETWORK_ERROR' 
  | 'SERVER_ERROR' 
  | 'INVALID_REQUEST' 
  | 'INVALID_RESPONSE' 
  | 'UNSUPPORTED_CAPABILITY' 
  | 'PROMPT_INJECTION_DETECTED' 
  | 'DOMAIN_VALIDATION_FAILED';

export interface AIRequest<T = any> {
  id: string;
  feature: string;
  requiredCapability: AICapability;
  prompt: string;
  inputData?: any;
  userConstraints?: {
    bpm?: number;
    key?: string;
    scale?: string;
    gainLimits?: { minDb: number; maxDb: number };
    limiterCeilingDbTP?: number;
  };
  preferredProvider?: AIProviderId;
  seed?: number;
  timeoutMs?: number;
}

export interface AIResponse<T = any> {
  requestId: string;
  status: 'success' | 'failed' | 'cancelled';
  lifecycleState: AIRequestLifecycleState;
  provider: AIProviderId;
  modelUsed?: string;
  label: 'Rule-based' | 'Deterministic' | 'Heuristic' | 'Analysis-based' | 'AI-assisted' | 'AI-generated';
  proposal?: T;
  proposalEnvelope?: AIProposalEnvelope<T>;
  error?: string;
  failureCategory?: AIFailureCategory;
  retryable?: boolean;
  fallbackAvailable?: boolean;
  latencyMs: number;
}

export interface AIProposalEnvelope<T = any> {
  proposalId: string;
  feature: string;
  schemaVersion: string;
  payload: T;
  provider: AIProviderId;
  label: string;
  isApplied: boolean;
  timestamp: number;
}

export interface AIObservabilityLog {
  requestId: string;
  timestamp: number;
  feature: string;
  provider: string;
  model?: string;
  latencyMs: number;
  status: string;
  retryCount: number;
  failureCategory?: string;
  schemaValid: boolean;
  domainValid: boolean;
}

export interface StructuredAiMusicProposal {
  genreStyle: string;
  overallMood: string;
  recommendedBpm: number;
  recommendedKey: string;
  scaleMode: 'major' | 'minor' | 'dorian' | 'raga_yaman' | 'raga_bhairav' | 'raga_kafi';
  timeSignature?: { numerator: number; denominator: number };
  sections: Array<{
    name: string;
    type: string;
    barCount: number;
    energyLevel: string;
    chords: string[];
    suggestedInstruments: string[];
  }>;
  suggestedMixerPresets?: {
    vocalReverb: string;
    compressionStyle: string;
    stereoSpread: string;
  };
}

export interface StructuredAiMixProposal {
  targetIntegratedLufs: number;
  vocalPriorityDuckDb: number;
  frequencyPockets: Array<{ instrument: string; frequencyHz: number; widthQ: number }>;
  masterLimiterCeilingDbTP: number;
  stereoWidthPercent: number;
  subMonoCollapseFreqHz: number;
  explanation: string;
}

export interface StructuredAiMasterProposal {
  targetLoudnessLufs: number;
  truePeakCeilingDbTP: number;
  eqAdjustments: Array<{ band: string; gainDb: number; q: number }>;
  glueCompressorThresholdDb: number;
  glueCompressorRatio: number;
  explanation: string;
}
